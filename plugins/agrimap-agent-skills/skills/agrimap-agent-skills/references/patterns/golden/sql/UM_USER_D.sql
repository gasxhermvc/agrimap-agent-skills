USE [AgriMapDB]
GO
/****** Object:  StoredProcedure [agrimap_app].[UM_USER_D]    Script Date: [<DATE_CREATED>] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author       : AgriMapDB Team Member
-- Create date  : 2026-03-28 14:17:00
-- Description  : ลบผู้ใช้งาน (Soft Delete) โดย STAMP DEL_FLAG ของ UM_USER
--                ข้อมูลเก่าของผู้ใช้งานเช่น PERMISSION / GROUP เก็บไว้ก่อน
--                จะมี Process มาเคลียร์ทุกๆ 2 เดือน
-- Data test    : 
--		DECLARE @STATUS INT, @STATUS_MSG NVARCHAR(4000), @ERROR_DETAIL NVARCHAR(4000);
--		EXEC [agrimap_app].[UM_USER_D]
--			@PI_USER_ID = 1,
--			@PI_SESSION_USER_ID = 1,
--			@PO_STATUS = @STATUS OUTPUT,
--			@PO_STATUS_MSG = @STATUS_MSG OUTPUT,
--			@PO_ERROR_DETAIL = @ERROR_DETAIL OUTPUT;
--		SELECT @STATUS AS STATUS, @STATUS_MSG AS STATUS_MSG, @ERROR_DETAIL AS ERROR_DETAIL;

-- Modified by  : 
-- Modified date: 
-- Description  : 
-- =============================================
CREATE PROCEDURE [agrimap_app].[UM_USER_D]
    @PI_USER_ID				NUMERIC(38, 0)	= NULL,
    @PI_SESSION_USER_ID		NUMERIC(38, 0)	= NULL,

    @PO_STATUS				INT				OUTPUT,
    @PO_STATUS_MSG			NVARCHAR(4000)	OUTPUT,
    @PO_ERROR_DETAIL		NVARCHAR(4000)	OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @PO_STATUS = 1;
    SET @PO_STATUS_MSG = '';
    SET @PO_ERROR_DETAIL = '';

    BEGIN TRANSACTION;
    BEGIN TRY

        -- =============================================
        -- Validate required parameters
        -- =============================================
        IF (@PI_USER_ID IS NULL)
            BEGIN
                THROW 50001, 'invalid_parameter', 1;
            END

        IF (@PI_SESSION_USER_ID IS NULL)
            BEGIN
                THROW 50001, 'session_user_required', 1;
            END

        -- =============================================
        -- ห้ามลบตัวเอง
        -- =============================================
        IF (@PI_USER_ID = @PI_SESSION_USER_ID)
            BEGIN
                THROW 50001, 'cannot_delete_self', 1;
            END

        -- =============================================
        -- ห้ามลบ User ที่มี Role = Root หรือ SuperAdmin
        -- =============================================
        IF
            EXISTS (
                SELECT 1
                FROM [agrimap_app].[UM_USER_ROLE] UR
                INNER JOIN
                    [agrimap_app].[UM_ROLE] R
                    ON UR.[ROLE_ID] = R.[ROLE_ID]
                WHERE
                    UR.[USER_ID] = @PI_USER_ID
                    AND R.[DEL_FLAG] = 0
                    AND UPPER(LTRIM(RTRIM(R.[ROLE_NAME]))) IN (
                        'ROOT', 'SUPERADMIN', 'SYSTEM'
                    )
            )
            BEGIN
                THROW 50001, 'cannot_delete_protected_role', 1;
            END

        -- =============================================
        -- Check user exists
        -- =============================================
        IF
            NOT EXISTS (
                SELECT 1
                FROM [agrimap_app].[UM_USER] WITH (UPDLOCK, HOLDLOCK)
                WHERE
                    [USER_ID] = @PI_USER_ID
                    AND [DEL_FLAG] = 0
            )
            BEGIN
                THROW 50001, 'user_not_found', 1;
            END

        -- =============================================
        -- Soft delete: set DEL_FLAG = 1
        -- ข้อมูลเก่าๆ เช่น PERMISSION / GROUP เก็บเอาไว้ก่อน
        -- จะมี Process มาเคลียร์ทุกๆ 2 เดือน
        -- =============================================
        UPDATE [agrimap_app].[UM_USER]
        SET
            [DEL_FLAG] = 1,
            [STATUS]
            = (
                SELECT TOP 1 [ID] FROM [agrimap_app].[LUT_UM_STATUS]
                WHERE [DESCR] = N'ยกเลิก'
            ),
            [DATE_MODIFIED] = GETDATE(),
            [USER_MODIFIED] = @PI_SESSION_USER_ID
        WHERE [USER_ID] = @PI_USER_ID;

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
