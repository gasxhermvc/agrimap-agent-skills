USE [AgriMapDB]
GO
/****** Object:  StoredProcedure [agrimap_app].[UM_USER_I]    Script Date: [<DATE_CREATED>] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author       : AgriMapDB Team Member
-- Create date  : 2026-03-28 14:17:00
-- Description  : สร้างผู้ใช้งานใหม่ พร้อมบันทึก Role และ Permission Function ที่เกี่ยวข้อง
--                PI_ROLE_LIST ใช้ pattern: ROLE_ID1^ROLE_ID2^...^ROLE_IDN
--                PI_PERMISSION_FUNCTION_LIST ใช้ pattern: FN_ID1^FN_ID2^...^FN_IDN
--                ห้ามบันทึกข้อมูลซ้ำ (USERNAME/EMAIL/TEL/ID_CARD) ยกเว้น DEL_FLAG = 1
-- Data test    : 
--		DECLARE @STATUS INT, @STATUS_MSG NVARCHAR(4000), @ERROR_DETAIL NVARCHAR(4000);
--		EXEC [agrimap_app].[UM_USER_I]
--			@PI_USERNAME = N'testuser01',
--			@PI_PASSWORD = N'hashedpassword123',
--			@PI_TITLE = 1,
--			@PI_NAME = N'ทดสอบ',
--			@PI_SURNAME = N'ระบบ',
--			@PI_DEPT = 1,
--			@PI_POSITION = 1,
--			@PI_ADDRESS = N'123 ถนนทดสอบ',
--			@PI_TEL = N'0812345678',
--			@PI_EMAIL = N'test@AgriMapDB.com',
--			@PI_ID_CARD = N'1234567890123',
--			@PI_STATUS = 1,
--			@PI_IMAGE = NULL,
--			@PI_FORCE_CHANGE_PASSWORD = 0,
--			@PI_SOURCE = NULL,
--			@PI_ROLE_LIST = '1^2',
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
CREATE PROCEDURE [agrimap_app].[UM_USER_I]
    @PI_USERNAME				NVARCHAR(20)	= NULL,
    @PI_PASSWORD				NVARCHAR(250)	= NULL,
    @PI_TITLE					INT				= NULL,
    @PI_NAME					NVARCHAR(50)	= NULL,
    @PI_SURNAME					NVARCHAR(50)	= NULL,
    @PI_DEPT					INT				= NULL,
    @PI_POSITION				INT				= NULL,
    @PI_ADDRESS					NVARCHAR(1000)	= NULL,
    @PI_TEL						NVARCHAR(10)	= NULL,
    @PI_EMAIL					NVARCHAR(100)	= NULL,
    @PI_ID_CARD					NVARCHAR(13)	= NULL,
    @PI_STATUS					INT				= 1,
    @PI_IMAGE					NVARCHAR(250)	= NULL,
    @PI_FORCE_CHANGE_PASSWORD	BIT				= 0,
    @PI_SOURCE					INT				= NULL,
    @PI_ROLE_LIST				NVARCHAR(MAX)	= NULL,
    @PI_PERMISSION_FUNCTION_LIST NVARCHAR(MAX)	= NULL,
    @PI_SESSION_USER_ID			NUMERIC(38, 0)	= NULL,

    @PO_STATUS					INT				OUTPUT,
    @PO_STATUS_MSG				NVARCHAR(4000)	OUTPUT,
    @PO_ERROR_DETAIL			NVARCHAR(4000)	OUTPUT
AS
DECLARE @V_USER_ID				NUMERIC(38, 0)	= NULL;
DECLARE @V_SPLIT_ROW			NVARCHAR(10);
DECLARE @V_ROWS					CURSOR;
DECLARE @V_ROW_VALUE			NVARCHAR(MAX);
DECLARE @V_ROLE_LIMITATION		INT				= NULL;
DECLARE @V_CURRENT_ROLE_COUNT	INT				= 0;
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
        IF (@PI_USERNAME IS NULL OR LTRIM(RTRIM(@PI_USERNAME)) = '')
            BEGIN
                THROW 50001, 'username_required', 1;
            END

        IF (@PI_PASSWORD IS NULL OR LTRIM(RTRIM(@PI_PASSWORD)) = '')
            BEGIN
                THROW 50001, 'password_required', 1;
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
        -- Check duplicate USERNAME (ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF
            EXISTS (
                SELECT 1
                FROM [agrimap_app].[UM_USER]
                WHERE
                    UPPER(LTRIM(RTRIM([USERNAME])))
                    = UPPER(LTRIM(RTRIM(@PI_USERNAME)))
                    AND [DEL_FLAG] = 0
            )
            BEGIN
                THROW 50001, 'username_duplicate', 1;
            END

        -- =============================================
        -- Check duplicate EMAIL (ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF
            EXISTS (
                SELECT 1
                FROM [agrimap_app].[UM_USER]
                WHERE
                    UPPER(LTRIM(RTRIM([EMAIL])))
                    = UPPER(LTRIM(RTRIM(@PI_EMAIL)))
                    AND [DEL_FLAG] = 0
            )
            BEGIN
                THROW 50001, 'email_duplicate', 1;
            END

        -- =============================================
        -- Check duplicate TEL (ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF (@PI_TEL IS NOT NULL AND LTRIM(RTRIM(@PI_TEL)) <> '')
            BEGIN
                IF
                    EXISTS (
                        SELECT 1
                        FROM [agrimap_app].[UM_USER]
                        WHERE
                            [TEL] = LTRIM(RTRIM(@PI_TEL))
                            AND [DEL_FLAG] = 0
                    )
                    BEGIN
                        THROW 50001, 'tel_duplicate', 1;
                    END
            END

        -- =============================================
        -- Check duplicate ID_CARD (ยกเว้น DEL_FLAG = 1)
        -- =============================================
        IF (@PI_ID_CARD IS NOT NULL AND LTRIM(RTRIM(@PI_ID_CARD)) <> '')
            BEGIN
                IF
                    EXISTS (
                        SELECT 1
                        FROM [agrimap_app].[UM_USER]
                        WHERE
                            [ID_CARD] = LTRIM(RTRIM(@PI_ID_CARD))
                            AND [DEL_FLAG] = 0
                    )
                    BEGIN
                        THROW 50001, 'id_card_duplicate', 1;
                    END
            END

        -- =============================================
        -- Insert user
        -- =============================================
        INSERT INTO [agrimap_app].[UM_USER] (
            [USERNAME],
            [PASSWORD],
            [TITLE],
            [NAME],
            [SURNAME],
            [DEPT],
            [POSITION],
            [ADDRESS],
            [TEL],
            [EMAIL],
            [ID_CARD],
            [STATUS],
            [IMAGE],
            [PASSWORD_MODIFIED],
            [FORCE_CHANGE_PASSWORD],
            [SOURCE],
            [DATE_CREATED],
            [USER_CREATED],
            [DEL_FLAG]
        )
        VALUES (
            LTRIM(RTRIM(@PI_USERNAME)),
            @PI_PASSWORD,
            @PI_TITLE,
            LTRIM(RTRIM(@PI_NAME)),
            LTRIM(RTRIM(@PI_SURNAME)),
            @PI_DEPT,
            @PI_POSITION,
            @PI_ADDRESS,
            LTRIM(RTRIM(@PI_TEL)),
            LTRIM(RTRIM(@PI_EMAIL)),
            LTRIM(RTRIM(@PI_ID_CARD)),
            ISNULL(
                @PI_STATUS, (
                    SELECT TOP 1 [ID] FROM [agrimap_app].[LUT_UM_STATUS]
                    WHERE [DESCR] = N'ใช้งาน'
                )
            ),
            @PI_IMAGE,
            GETDATE(),
            ISNULL(@PI_FORCE_CHANGE_PASSWORD, 1),
            @PI_SOURCE,
            GETDATE(),
            @PI_SESSION_USER_ID,
            0
        );

        SET @V_USER_ID = SCOPE_IDENTITY();

        -- =============================================
        -- Insert user roles (if provided)
        -- Pattern: ROLE_ID1^ROLE_ID2^...^ROLE_IDN
        -- =============================================
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

                                    -- ตรวจสอบว่ายังไม่ได้มี Role นี้
                                IF
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM [agrimap_app].[UM_USER_ROLE]
                                        WHERE
                                            [USER_ID] = @V_USER_ID
                                            AND [ROLE_ID]
                                            = CAST(
                                                @V_ROW_VALUE AS NUMERIC(38, 0)
                                            )
                                    )
                                    BEGIN
                                        INSERT INTO [agrimap_app].[UM_USER_ROLE] (
                                            [USER_ID],
                                            [ROLE_ID]
                                        )
                                        VALUES (
                                            @V_USER_ID,
                                            CAST(
                                                @V_ROW_VALUE AS NUMERIC(38, 0)
                                            )
                                        );
                                    END
                            END

                        FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;
                    END

                CLOSE @V_ROWS;
                DEALLOCATE @V_ROWS;
            END

        -- =============================================
        -- Insert user permission functions (if provided)
        -- Pattern: FUNCTION_ID1^FUNCTION_ID2^...^FUNCTION_IDN
        -- =============================================
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
                                -- ตรวจสอบว่ายังไม่ได้มี Permission นี้
                                IF
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM
                                            [agrimap_app].[UM_USER_PERMISSION_FUNCTION]
                                        WHERE
                                            [USER_ID] = @V_USER_ID
                                            AND [FUNCTION_ID]
                                            = LTRIM(RTRIM(@V_ROW_VALUE))
                                    )
                                    BEGIN
                                        INSERT INTO [agrimap_app].[UM_USER_PERMISSION_FUNCTION] (
                                            [USER_ID],
                                            [FUNCTION_ID]
                                        )
                                        VALUES (
                                            @V_USER_ID,
                                            LTRIM(RTRIM(@V_ROW_VALUE))
                                        );
                                    END
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
