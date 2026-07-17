USE [AgriMapDB]
GO
/****** Object:  StoredProcedure [agrimap_app].[UM_USER_U]    Script Date: [<DATE_CREATED>] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author       : AgriMapDB Team Member
-- Create date  : 2026-03-28 14:17:00
-- Description  : อัปเดตข้อมูลผู้ใช้งาน และจัดการ Role และ Permission Function ที่เกี่ยวข้อง
--                PI_ROLE_LIST ใช้ pattern: ROLE_ID1^ROLE_ID2^...^ROLE_IDN
--                PI_PERMISSION_FUNCTION_LIST ใช้ pattern: FN_ID1^FN_ID2^...^FN_IDN
--                PASSWORD เป็น OPTIONAL หากส่งมาให้บันทึกทับ หากไม่ส่งมาให้ข้ามไป
--                ห้ามแก้ไข USERNAME ของตัวเอง
-- Data test    : 
--		DECLARE @STATUS INT, @STATUS_MSG NVARCHAR(4000), @ERROR_DETAIL NVARCHAR(4000);
--		EXEC [agrimap_app].[UM_USER_U]
--			@PI_USER_ID = 1,
--			@PI_PASSWORD = NULL,
--			@PI_TITLE = 1,
--			@PI_NAME = N'ทดสอบ (แก้ไข)',
--			@PI_SURNAME = N'ระบบ (แก้ไข)',
--			@PI_DEPT = 1,
--			@PI_POSITION = 1,
--			@PI_ADDRESS = N'456 ถนนแก้ไข',
--			@PI_TEL = N'0898765432',
--			@PI_EMAIL = N'test_edit@AgriMapDB.com',
--			@PI_ID_CARD = N'1234567890123',
--			@PI_STATUS = 1,
--			@PI_IMAGE = NULL,
--			@PI_FORCE_CHANGE_PASSWORD = 0,
--			@PI_SOURCE = NULL,
--			@PI_ROLE_LIST = '1^3',
--			@PI_PERMISSION_FUNCTION_LIST = '1^2^3',
--			@PI_SESSION_USER_ID = 1,
--			@PO_STATUS = @STATUS OUTPUT,
--			@PO_STATUS_MSG = @STATUS_MSG OUTPUT,
--			@PO_ERROR_DETAIL = @ERROR_DETAIL OUTPUT;
--		SELECT @STATUS AS STATUS, @STATUS_MSG AS STATUS_MSG, @ERROR_DETAIL AS ERROR_DETAIL;

-- Modified by  : 
-- Modified date: 
-- Description  : 
-- =============================================
CREATE PROCEDURE [agrimap_app].[UM_USER_U]
    @PI_USER_ID						NUMERIC(38, 0)	= NULL,
    @PI_PASSWORD					NVARCHAR(250)	= NULL,
    @PI_TITLE						INT				= NULL,
    @PI_NAME						NVARCHAR(50)	= NULL,
    @PI_SURNAME						NVARCHAR(50)	= NULL,
    @PI_DEPT						INT				= NULL,
    @PI_POSITION					INT				= NULL,
    @PI_ADDRESS						NVARCHAR(1000)	= NULL,
    @PI_TEL							NVARCHAR(10)	= NULL,
    @PI_EMAIL						NVARCHAR(100)	= NULL,
    @PI_ID_CARD						NVARCHAR(13)	= NULL,
    @PI_STATUS						INT				= NULL,
    @PI_IMAGE						NVARCHAR(250)	= NULL,
    @PI_FORCE_CHANGE_PASSWORD		BIT				= NULL,
    @PI_SOURCE						INT				= NULL,
    @PI_ROLE_LIST					NVARCHAR(MAX)	= NULL,
    @PI_PERMISSION_FUNCTION_LIST	NVARCHAR(MAX)	= NULL,
    @PI_SESSION_USER_ID				NUMERIC(38, 0)	= NULL,

    @PO_STATUS						INT				OUTPUT,
    @PO_STATUS_MSG					NVARCHAR(4000)	OUTPUT,
    @PO_ERROR_DETAIL				NVARCHAR(4000)	OUTPUT
AS
DECLARE @V_SPLIT_ROW				NVARCHAR(10);
DECLARE @V_ROWS						CURSOR;
DECLARE @V_ROW_VALUE				NVARCHAR(MAX);
DECLARE @V_ROLE_LIMITATION			INT				= NULL;
DECLARE @V_CURRENT_ROLE_COUNT		INT				= 0;
BEGIN
    SET NOCOUNT ON;
    SET @PO_STATUS = 1;
    SET @PO_STATUS_MSG = '';
    SET @PO_ERROR_DETAIL = '';

    SET @V_SPLIT_ROW = '^';

    BEGIN TRANSACTION;
    BEGIN TRY

        -- =============================================
        -- Validate required parameters
        -- =============================================
        IF (@PI_USER_ID IS NULL)
            BEGIN
                THROW 50001, 'invalid_parameter', 1;
            END

        IF (@PI_NAME IS NULL OR LTRIM(RTRIM(@PI_NAME)) = '')
            BEGIN
                THROW 50001, 'name_required', 1;
            END

        IF (@PI_SURNAME IS NULL OR LTRIM(RTRIM(@PI_SURNAME)) = '')
            BEGIN
                THROW 50001, 'surname_required', 1;
            END

        IF (@PI_EMAIL IS NULL OR LTRIM(RTRIM(@PI_EMAIL)) = '')
            BEGIN
                THROW 50001, 'email_required', 1;
            END

        IF (@PI_SESSION_USER_ID IS NULL)
            BEGIN
                THROW 50001, 'session_user_required', 1;
            END

        -- =============================================
        -- Check user exists
        -- =============================================
        IF
            NOT EXISTS (
                SELECT 1
                FROM [agrimap_app].[UM_USER]
                WHERE
                    [USER_ID] = @PI_USER_ID
                    AND [DEL_FLAG] = 0
            )
            BEGIN
                THROW 50001, 'user_not_found', 1;
            END

        -- =============================================
        -- Check duplicate EMAIL (exclude current user, ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF
            EXISTS (
                SELECT 1
                FROM [agrimap_app].[UM_USER]
                WHERE
                    [USER_ID] <> @PI_USER_ID
                    AND UPPER(LTRIM(RTRIM([EMAIL])))
                    = UPPER(LTRIM(RTRIM(@PI_EMAIL)))
                    AND [DEL_FLAG] = 0
            )
            BEGIN
                THROW 50001, 'email_duplicate', 1;
            END

        -- =============================================
        -- Check duplicate TEL (exclude current user, ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF (@PI_TEL IS NOT NULL AND LTRIM(RTRIM(@PI_TEL)) <> '')
            BEGIN
                IF
                    EXISTS (
                        SELECT 1
                        FROM [agrimap_app].[UM_USER]
                        WHERE
                            [USER_ID] <> @PI_USER_ID
                            AND [TEL] = LTRIM(RTRIM(@PI_TEL))
                            AND [DEL_FLAG] = 0
                    )
                    BEGIN
                        THROW 50001, 'tel_duplicate', 1;
                    END
            END

        -- =============================================
        -- Check duplicate ID_CARD (exclude current user, ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF (@PI_ID_CARD IS NOT NULL AND LTRIM(RTRIM(@PI_ID_CARD)) <> '')
            BEGIN
                IF
                    EXISTS (
                        SELECT 1
                        FROM [agrimap_app].[UM_USER]
                        WHERE
                            [USER_ID] <> @PI_USER_ID
                            AND [ID_CARD] = LTRIM(RTRIM(@PI_ID_CARD))
                            AND [DEL_FLAG] = 0
                    )
                    BEGIN
                        THROW 50001, 'id_card_duplicate', 1;
                    END
            END

        -- =============================================
        -- Update user information
        -- PASSWORD เป็น OPTIONAL: หากส่งมาให้บันทึกทับ หากไม่ส่งให้ข้ามไป
        -- ห้ามแก้ไข USERNAME
        -- =============================================
        UPDATE [agrimap_app].[UM_USER]
        SET
            [PASSWORD] = CASE
                WHEN
                    @PI_PASSWORD IS NOT NULL
                    AND LTRIM(RTRIM(@PI_PASSWORD)) <> ''
                    THEN @PI_PASSWORD
                ELSE [PASSWORD]
            END,
            [PASSWORD_MODIFIED] = CASE
                WHEN
                    @PI_PASSWORD IS NOT NULL
                    AND LTRIM(RTRIM(@PI_PASSWORD)) <> ''
                    THEN GETDATE()
                ELSE [PASSWORD_MODIFIED]
            END,
            [TITLE] = @PI_TITLE,
            [NAME] = LTRIM(RTRIM(@PI_NAME)),
            [SURNAME] = LTRIM(RTRIM(@PI_SURNAME)),
            [DEPT] = @PI_DEPT,
            [POSITION] = @PI_POSITION,
            [ADDRESS] = @PI_ADDRESS,
            [TEL] = LTRIM(RTRIM(@PI_TEL)),
            [EMAIL] = LTRIM(RTRIM(@PI_EMAIL)),
            [ID_CARD] = LTRIM(RTRIM(@PI_ID_CARD)),
            [STATUS] = ISNULL(@PI_STATUS, [STATUS]),
            [IMAGE] = CASE
                WHEN @PI_IMAGE IS NOT NULL THEN @PI_IMAGE
                ELSE [IMAGE]
            END,
            [FORCE_CHANGE_PASSWORD]
            = ISNULL(@PI_FORCE_CHANGE_PASSWORD, [FORCE_CHANGE_PASSWORD]),
            [SOURCE] = CASE
                WHEN @PI_SOURCE IS NOT NULL THEN @PI_SOURCE
                ELSE [SOURCE]
            END,
            [DATE_MODIFIED] = GETDATE(),
            [USER_MODIFIED] = @PI_SESSION_USER_ID
        WHERE [USER_ID] = @PI_USER_ID;

        -- =============================================
        -- Manage user roles
        -- ลบ Role เดิมทั้งหมดออก แล้ว Insert ใหม่ตาม PI_ROLE_LIST
        -- =============================================

        -- ลบ Role เดิมทั้งหมด
        DELETE FROM [agrimap_app].[UM_USER_ROLE]
        WHERE [USER_ID] = @PI_USER_ID;

        -- Insert Role ใหม่
        IF (@PI_ROLE_LIST IS NOT NULL AND LTRIM(RTRIM(@PI_ROLE_LIST)) <> '')
            BEGIN
                SET
                    @V_ROWS = CURSOR FOR
                    SELECT [value]
                    FROM STRING_SPLIT(@PI_ROLE_LIST, @V_SPLIT_ROW)
                    WHERE LTRIM(RTRIM([value])) <> '';

                OPEN @V_ROWS;
                FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;

                WHILE @@FETCH_STATUS = 0
                    BEGIN
                        -- ตรวจสอบว่า Role มีอยู่ในระบบ
                        IF
                            EXISTS (
                                SELECT 1
                                FROM [agrimap_app].[UM_ROLE]
                                WHERE
                                    [ROLE_ID]
                                    = CAST(@V_ROW_VALUE AS NUMERIC(38, 0))
                                    AND [DEL_FLAG] = 0
                            )
                            BEGIN
                                -- =============================================
                                -- ตรวจสอบว่าไม่ใช่บทบาท Root หรือ SuperAdmin (ROLE_LEVEL 1, 2)
                                -- ห้ามกำหนดบทบาทนี้ให้ผู้ใช้งานใดๆ
                                -- =============================================
                                IF
                                    EXISTS (
                                        SELECT 1
                                        FROM [agrimap_app].[UM_ROLE]
                                        WHERE
                                            [ROLE_ID]
                                            = CAST(
                                                @V_ROW_VALUE AS NUMERIC(38, 0)
                                            )
                                            AND [ROLE_LEVEL] IN (1, 2)
                                            AND [DEL_FLAG] = 0
                                    )
                                    BEGIN
                                        THROW 50001,
                                        'role_protected_cannot_assign',
                                        1;
                                    END

                                    -- =============================================
                                    -- ตรวจสอบ ROLE_LIMITATION ต่อหน่วยงาน
                                    -- (ROLE_LIMITATION IS NOT NULL = มีการกำหนดจำนวนสูงสุดต่อ ORG)
                                    -- (roles ของ user นี้ถูกลบออกแล้วก่อน insert ใหม่ → นับได้ถูกต้อง)
                                    -- =============================================
                                SET @V_ROLE_LIMITATION = NULL;
                                SET @V_CURRENT_ROLE_COUNT = 0;

                                SELECT @V_ROLE_LIMITATION = [ROLE_LIMITATION]
                                FROM [agrimap_app].[UM_ROLE]
                                WHERE
                                    [ROLE_ID]
                                    = CAST(@V_ROW_VALUE AS NUMERIC(38, 0))
                                    AND [DEL_FLAG] = 0;

                                IF (@V_ROLE_LIMITATION IS NOT NULL)
                                    BEGIN
                                        SELECT @V_CURRENT_ROLE_COUNT = COUNT(1)
                                        FROM [agrimap_app].[UM_USER_ROLE] ur
                                        INNER JOIN
                                            [agrimap_app].[UM_USER] u
                                            ON ur.[USER_ID] = u.[USER_ID]
                                        WHERE
                                            ur.[ROLE_ID]
                                            = CAST(
                                                @V_ROW_VALUE AS NUMERIC(38, 0)
                                            )
                                            AND u.[DEL_FLAG] = 0;

                                        IF
                                            (
                                                @V_CURRENT_ROLE_COUNT
                                                >= @V_ROLE_LIMITATION
                                            )
                                            BEGIN
                                                THROW 50001,
                                                'role_limitation_exceeded',
                                                1;
                                            END
                                    END

                                INSERT INTO [agrimap_app].[UM_USER_ROLE] (
                                    [USER_ID],
                                    [ROLE_ID]
                                )
                                VALUES (
                                    @PI_USER_ID,
                                    CAST(@V_ROW_VALUE AS NUMERIC(38, 0))
                                );
                            END

                        FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;
                    END

                CLOSE @V_ROWS;
                DEALLOCATE @V_ROWS;
            END

        -- =============================================
        -- Manage user permission functions
        -- ลบ Permission Function เดิมทั้งหมดออก แล้ว Insert ใหม่ตาม PI_PERMISSION_FUNCTION_LIST
        -- =============================================

        -- ลบ Permission Function เดิมทั้งหมด
        DELETE FROM [agrimap_app].[UM_USER_PERMISSION_FUNCTION]
        WHERE [USER_ID] = @PI_USER_ID;

        -- Insert Permission Function ใหม่
        IF
            (
                @PI_PERMISSION_FUNCTION_LIST IS NOT NULL
                AND LTRIM(RTRIM(@PI_PERMISSION_FUNCTION_LIST)) <> ''
            )
            BEGIN
                SET
                    @V_ROWS = CURSOR FOR
                    SELECT [value]
                    FROM
                        STRING_SPLIT(@PI_PERMISSION_FUNCTION_LIST, @V_SPLIT_ROW)
                    WHERE LTRIM(RTRIM([value])) <> '';

                OPEN @V_ROWS;
                FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;

                WHILE @@FETCH_STATUS = 0
                    BEGIN
                        -- ตรวจสอบว่า Function มีอยู่ในระบบ
                        IF
                            EXISTS (
                                SELECT 1
                                FROM [agrimap_app].[UM_FUNCTION]
                                WHERE [FUNCTION_ID] = LTRIM(RTRIM(@V_ROW_VALUE))
                            )
                            BEGIN
                                INSERT INTO [agrimap_app].[UM_USER_PERMISSION_FUNCTION] (
                                    [USER_ID],
                                    [FUNCTION_ID]
                                )
                                VALUES (
                                    @PI_USER_ID,
                                    LTRIM(RTRIM(@V_ROW_VALUE))
                                );
                            END

                        FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;
                    END

                CLOSE @V_ROWS;
                DEALLOCATE @V_ROWS;
            END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @PO_STATUS = 0;
        SET @PO_STATUS_MSG = ERROR_MESSAGE();
        SET @PO_ERROR_DETAIL = agrimap_app.FN_GET_ERROR_MESSAGE(
            ERROR_NUMBER(),
            (SELECT OBJECT_NAME(@@PROCID)),
            ERROR_LINE(),
            ERROR_MESSAGE()
        );
    END CATCH
END
GO
