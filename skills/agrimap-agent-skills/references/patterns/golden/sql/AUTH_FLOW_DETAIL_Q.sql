USE [AgriMapDB]
GO

/****** Object:  StoredProcedure [agrimap_app].[AUTH_FLOW_DETAIL_Q]    Script Date: 26/5/2569 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author       : AgriMapDB Team Member
-- Create date  : 2026-05-26
-- Description  : ดึงข้อมูลรายละเอียด Authentication Flow ตาม AUTH_FLOW_ID และ USER_ID
-- Data test    :
--      DECLARE @STATUS INT, @STATUS_MSG NVARCHAR(4000), @ERROR_DETAIL NVARCHAR(4000);
--      EXEC [agrimap_app].[AUTH_FLOW_DETAIL_Q]
--          @PI_AUTH_FLOW_ID        = N'your-auth-flow-guid-here',
--          @PI_SESSION_USER_ID     = 1,
--          @PO_STATUS              = @STATUS OUTPUT,
--          @PO_STATUS_MSG          = @STATUS_MSG OUTPUT,
--          @PO_ERROR_DETAIL        = @ERROR_DETAIL OUTPUT;
--      SELECT @STATUS AS STATUS, @STATUS_MSG AS STATUS_MSG, @ERROR_DETAIL AS ERROR_DETAIL;
-- Modified by  :
-- Modified date:
-- Description  :
-- =============================================
CREATE PROCEDURE [agrimap_app].[AUTH_FLOW_DETAIL_Q]
	@PI_AUTH_FLOW_ID		NVARCHAR(100)		= NULL,
	@PI_SESSION_USER_ID		NUMERIC(38, 0)		= NULL,

	@PO_STATUS				INT					OUTPUT,
	@PO_STATUS_MSG			NVARCHAR(4000)		OUTPUT,
	@PO_ERROR_DETAIL		NVARCHAR(4000)		OUTPUT
AS
BEGIN
	SET NOCOUNT ON;
	SET @PO_STATUS = 1;
	SET @PO_STATUS_MSG = '';
	SET @PO_ERROR_DETAIL = '';

	BEGIN TRY

		-- =============================================
		-- Validate required parameters
		-- =============================================
		IF (@PI_AUTH_FLOW_ID IS NULL OR LTRIM(RTRIM(@PI_AUTH_FLOW_ID)) = '')
			THROW 50001, 'auth_flow_id_required', 1;

		IF (@PI_SESSION_USER_ID IS NULL)
			THROW 50001, 'session_user_required', 1;

		-- =============================================
		-- Check AUTH_FLOW exists and belongs to user
		-- =============================================
		IF NOT EXISTS (
			SELECT 1
			FROM [agrimap_app].[AUTH_FLOW]
			WHERE [ID] = @PI_AUTH_FLOW_ID
				AND [USER_ID] = @PI_SESSION_USER_ID
				AND [DEL_FLAG] = 0
		)
		BEGIN
			THROW 50001, 'auth_flow_not_found', 1;
		END

		-- =============================================
		-- Query AUTH_FLOW detail
		-- =============================================
		SELECT
			AF.[ID]					AS [AUTH_FLOW_ID],
			AF.[USER_ID],
			AF.[COOKIE_ID],
			AF.[APP_ID],
			AF.[PROVIDER],
			AF.[PURPOSE],
			AF.[PROMPT],
			AF.[PAYLOAD],
			AF.[DATE_EXPIRED],
			AF.[REVOKED],
			AF.[DATE_CREATED]
		FROM [agrimap_app].[AUTH_FLOW] AF
		WHERE AF.[ID] = @PI_AUTH_FLOW_ID
			AND AF.[USER_ID] = @PI_SESSION_USER_ID
			AND AF.[DEL_FLAG] = 0;

	END TRY
	BEGIN CATCH
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
