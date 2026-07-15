-- REVIEW EXAMPLE: use only when the active project proves
-- [agrimap_app].[LUT_APP_MESSAGES] ([ID], [DESCR]).

-- sample_name_required
IF NOT EXISTS (
	SELECT 1
	FROM [agrimap_app].[LUT_APP_MESSAGES]
	WHERE [ID] = 'sample_name_required'
)
BEGIN
	INSERT INTO [agrimap_app].[LUT_APP_MESSAGES] ([ID], [DESCR])
	VALUES ('sample_name_required', N'กรุณาระบุชื่อรายการ');
END
GO

-- sample_code_duplicate
IF NOT EXISTS (
	SELECT 1
	FROM [agrimap_app].[LUT_APP_MESSAGES]
	WHERE [ID] = 'sample_code_duplicate'
)
BEGIN
	INSERT INTO [agrimap_app].[LUT_APP_MESSAGES] ([ID], [DESCR])
	VALUES ('sample_code_duplicate', N'รหัสรายการนี้ถูกใช้งานแล้ว');
END
GO
