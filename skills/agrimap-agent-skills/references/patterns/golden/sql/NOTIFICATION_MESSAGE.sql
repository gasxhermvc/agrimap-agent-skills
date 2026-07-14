USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[NOTIFICATION_MESSAGE]    Script Date: 2026-03-23 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[NOTIFICATION_MESSAGE](

	-- Primary Key
	[ID]				NUMERIC(38,0)		IDENTITY(1,1)	NOT NULL,

	-- Reference Columns (FK)
	[TEMPLATE_ID]		INT									NOT NULL,	-- FK -> NOTIFICATION_TEMPLATE
	[STATUS_ID]			INT									NOT NULL,	-- FK -> LUT_NOTI_MESSAGE_STATUS
	[PRIORITY_ID]		INT									NOT NULL,	-- FK -> LUT_NOTI_PRIORITY
	[CREATE_SOURCE_ID]	INT									NOT NULL,	-- FK -> LUT_NOTI_CREATE_SOURCE
	[CREATE_TYPE_ID]	INT									NOT NULL,	-- FK -> LUT_NOTI_CREATE_TYPE

	-- Audit Columns
	[DATE_CREATED]		DATETIME2(7)						NOT NULL,
	[DATE_MODIFIED]		DATETIME2(7)						NULL,
	[USER_CREATED]		NUMERIC(38,0)						NOT NULL,
	[USER_UPDATED]		NUMERIC(38,0)						NOT NULL,

	-- Soft Delete
	[DEL_FLAG]			BIT									NOT NULL,

 CONSTRAINT [PK_NOTIFICATION_MESSAGE] PRIMARY KEY CLUSTERED
(
	[ID] ASC
) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]
GO

-- =============================================
-- Default Values
-- =============================================
ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE]
ADD DEFAULT (GETDATE()) FOR [DATE_CREATED]
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE]
ADD DEFAULT (2) FOR [PRIORITY_ID]
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE]
ADD DEFAULT (0) FOR [DEL_FLAG]
GO

-- =============================================
-- Foreign Keys
-- =============================================
ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_MESSAGE_NOTIFICATION_TEMPLATE]
FOREIGN KEY ([TEMPLATE_ID])
REFERENCES [agrimap_app].[NOTIFICATION_TEMPLATE]([ID])
ON UPDATE CASCADE
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_MESSAGE_LUT_NOTI_MESSAGE_STATUS]
FOREIGN KEY ([STATUS_ID])
REFERENCES [agrimap_app].[LUT_NOTI_MESSAGE_STATUS]([ID])
ON UPDATE CASCADE
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_MESSAGE_LUT_NOTI_PRIORITY]
FOREIGN KEY ([PRIORITY_ID])
REFERENCES [agrimap_app].[LUT_NOTI_PRIORITY]([ID])
ON UPDATE CASCADE
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_MESSAGE_LUT_NOTI_CREATE_SOURCE]
FOREIGN KEY ([CREATE_SOURCE_ID])
REFERENCES [agrimap_app].[LUT_NOTI_CREATE_SOURCE]([ID])
ON UPDATE CASCADE
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_MESSAGE] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_MESSAGE_LUT_NOTI_CREATE_TYPE]
FOREIGN KEY ([CREATE_TYPE_ID])
REFERENCES [agrimap_app].[LUT_NOTI_CREATE_TYPE]([ID])
ON UPDATE CASCADE
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัส ID ของ Notification Message (Auto Increment)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'FK -> NOTIFICATION_TEMPLATE: Template ที่ใช้สร้าง Message' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'TEMPLATE_ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'FK -> LUT_NOTI_MESSAGE_STATUS: สถานะ (Created, Processing, Done, Failed)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'STATUS_ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'FK -> LUT_NOTI_PRIORITY: ระดับความสำคัญ (Low, Normal, High, Urgent)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'PRIORITY_ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'FK -> LUT_NOTI_CREATE_SOURCE: แหล่งที่มา (User Management, Data Management)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'CREATE_SOURCE_ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'FK -> LUT_NOTI_CREATE_TYPE: ประเภทผู้สร้าง (User, System, Schedule)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'CREATE_TYPE_ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'0 = ปกติ, 1 = ลบแล้ว (Soft Delete)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_MESSAGE', @level2type=N'COLUMN',@level2name=N'DEL_FLAG';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_MESSAGE_STATUS]
ON [agrimap_app].[NOTIFICATION_MESSAGE]([STATUS_ID] ASC)
GO

CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_MESSAGE_PRIORITY]
ON [agrimap_app].[NOTIFICATION_MESSAGE]([PRIORITY_ID] ASC)
GO

CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_MESSAGE_TEMPLATE]
ON [agrimap_app].[NOTIFICATION_MESSAGE]([TEMPLATE_ID] ASC)
GO

CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_MESSAGE_STATUS_PRIORITY]
ON [agrimap_app].[NOTIFICATION_MESSAGE]([STATUS_ID] ASC, [PRIORITY_ID] ASC)
INCLUDE ([TEMPLATE_ID], [DATE_CREATED])
GO
