USE [AgriMapDB]
GO
/****** Object:  StoredProcedure [agrimap_app].[NOTIFICATION_USERS_Q]    Script Date: 2026-03-23 00:00:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author       : AgriMapDB Team Member
-- Create date  : 2026-03-23
-- Description  : ดึงรายการ User ที่สามารถส่ง Push Notification ได้
--                - รับ USER_LIST รูปแบบ '1^2^3^...^n' (^ คือ delimiter)
--                - ค้นหาจากตาราง APP_USER_TOKEN เพื่อดึง FCM_TOKEN ที่ยังใช้ได้
--                เงื่อนไข:
--                  * FCM_TOKEN IS NOT NULL AND FCM_TOKEN != ''
--                  * DATE_EXPIRED > GETDATE() (ยังไม่หมดอายุ)
--                  * DEL_FLAG = 0 (ยังไม่ถูก Revoke)
--                หมายเหตุ: 1 User อาจมีหลาย Token (หลายอุปกรณ์)
--                          ตาราง NOTIFICATION_USER_DEVICE เป็นเพียง LOG
--                          FCM_TOKEN จริงอยู่ที่ APP_USER_TOKEN
--                สิทธิ์: Root / SuperAdmin / System เท่านั้น
-- Data test    :
--		DECLARE @STATUS INT, @STATUS_MSG NVARCHAR(4000), @ERROR_DETAIL NVARCHAR(4000);
--		EXEC [agrimap_app].[NOTIFICATION_USERS_Q]
--			@PI_USER_LIST = N'10^20^30',
--			@PI_SESSION_USER_ID = 1,
--			@PO_STATUS = @STATUS OUTPUT,
--			@PO_STATUS_MSG = @STATUS_MSG OUTPUT,
--			@PO_ERROR_DETAIL = @ERROR_DETAIL OUTPUT;
--		SELECT @STATUS AS STATUS, @STATUS_MSG AS STATUS_MSG, @ERROR_DETAIL AS ERROR_DETAIL;

-- Modified by  :
-- Modified date:
-- Description  :
-- =============================================
CREATE PROCEDURE [agrimap_app].[NOTIFICATION_USERS_Q]
	@PI_USER_LIST			VARCHAR(MAX)	= NULL,		-- '1^2^3^...^n'
	@PI_SESSION_USER_ID		NUMERIC(38,0)	= NULL,

	@PO_STATUS				INT				OUTPUT,
	@PO_STATUS_MSG			NVARCHAR(4000)	OUTPUT,
	@PO_ERROR_DETAIL		NVARCHAR(4000)	OUTPUT
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
		IF (@PI_USER_LIST IS NULL OR LTRIM(RTRIM(@PI_USER_LIST)) = '')
		BEGIN
			THROW 50001, 'noti_user_list_required', 1;
		END

		IF (@PI_SESSION_USER_ID IS NULL)
		BEGIN
			THROW 50001, 'session_user_required', 1;
		END

		-- =============================================
		-- Check permission: Root / SuperAdmin / System เท่านั้น
		-- =============================================
		IF NOT EXISTS (
			SELECT 1
			FROM [agrimap_app].[UM_USER_ROLE] UR
			INNER JOIN [agrimap_app].[UM_ROLE] R ON UR.[ROLE_ID] = R.[ROLE_ID]
			WHERE UR.[USER_ID] = @PI_SESSION_USER_ID
				AND R.[DEL_FLAG] = 0
				AND UPPER(LTRIM(RTRIM(R.[ROLE_NAME]))) IN ('ROOT', 'SUPERADMIN', 'SYSTEM')
		)
		BEGIN
			THROW 50001, 'permission_denied', 1;
		END

		-- =============================================
		-- Query APP_USER_TOKEN for active FCM Tokens
		-- =============================================
		-- หา User ทุกคนใน USER_LIST ที่มี Token ที่:
		--   1. FCM_TOKEN ไม่ว่าง
		--   2. ยังไม่หมดอายุ
		--   3. DEL_FLAG = 0 (ไม่ถูก Revoke)
		-- 1 User อาจมีหลาย Token (หลายอุปกรณ์ / หลาย Session)
		SELECT
			T.[USER_ID],
			T.[FCM_TOKEN],
			T.[DATE_EXPIRED]
		FROM [agrimap_app].[APP_USER_TOKEN] T
		INNER JOIN STRING_SPLIT(@PI_USER_LIST, '^') S
			ON TRY_CAST(LTRIM(RTRIM(S.[value])) AS NUMERIC(38, 0)) = T.[USER_ID]
		WHERE T.[DEL_FLAG]		= 0
			AND T.[DATE_EXPIRED]	> GETDATE()
			AND T.[FCM_TOKEN]		IS NOT NULL
			AND LTRIM(RTRIM(T.[FCM_TOKEN])) <> ''
			AND LTRIM(RTRIM(S.[value])) <> '';

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
