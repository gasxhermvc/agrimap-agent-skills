USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[NOTIFICATION_TEMPLATE]    Script Date: 2026-03-23 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[NOTIFICATION_TEMPLATE](

    -- Primary Key
    [ID]				INT					IDENTITY(1,1)	NOT NULL,

    -- Business Keys
    -- รหัส Template เช่น REGISTER_SUCCESS
    [TEMPLATE_CODE]		VARCHAR(100)						NOT NULL,

    -- Business Data
    [CHANNEL_ID]		INT									NOT NULL,	-- FK -> LUT_NOTI_CHANNEL
    -- ชื่อไฟล์ Template เช่น register-success.html
    [TEMPLATE_FILE]		VARCHAR(100)						NOT NULL,
    [SUBJECT_TEMPLATE]	NVARCHAR(255)						NULL,		-- หัวข้อ Email
    [TITLE_TEMPLATE]	NVARCHAR(255)						NULL,		-- หัวข้อ InApp / Push
    [BODY_TEMPLATE]		NVARCHAR(MAX)						NULL,		-- เนื้อหา InApp / Push
    [STORE_CONTENT]		BIT									NOT NULL,	-- เก็บ rendered content หรือไม่

    -- Audit Columns
    [DATE_CREATED]		DATETIME2(7)						NOT NULL,
    [DATE_MODIFIED]		DATETIME2(7)						NULL,
    [USER_CREATED]		NUMERIC(38,0)						NOT NULL,
    [USER_UPDATED]		NUMERIC(38,0)						NOT NULL,

    -- Soft Delete
    [DEL_FLAG]			BIT									NOT NULL,

    CONSTRAINT [PK_NOTIFICATION_TEMPLATE] PRIMARY KEY CLUSTERED
    (
        [ID] ASC
    ) WITH (
        PAD_INDEX = OFF,
        STATISTICS_NORECOMPUTE = OFF,
        IGNORE_DUP_KEY = OFF,
        ALLOW_ROW_LOCKS = ON,
        ALLOW_PAGE_LOCKS = ON
    ) ON [PRIMARY]

) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- =============================================
-- Default Values
-- =============================================
ALTER TABLE [agrimap_app].[NOTIFICATION_TEMPLATE]
ADD DEFAULT (GETDATE()) FOR [DATE_CREATED]
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_TEMPLATE]
ADD DEFAULT (1) FOR [STORE_CONTENT]
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_TEMPLATE]
ADD DEFAULT (0) FOR [DEL_FLAG]
GO

-- =============================================
-- Foreign Keys
-- =============================================
ALTER TABLE [agrimap_app].[NOTIFICATION_TEMPLATE] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_TEMPLATE_LUT_NOTI_CHANNEL]
FOREIGN KEY ([CHANNEL_ID])
REFERENCES [agrimap_app].[LUT_NOTI_CHANNEL]([ID])
ON UPDATE CASCADE
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส ID ของ Notification Template (Auto Increment)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'ID';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส Template เช่น REGISTER_SUCCESS, PASSWORD_RESET' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'TEMPLATE_CODE';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'FK -> LUT_NOTI_CHANNEL: ช่องทางการส่ง (Email, Push, InApp, Teams)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'CHANNEL_ID';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ชื่อไฟล์ Template เช่น register-success.html' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'TEMPLATE_FILE';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'หัวข้อสำหรับ Email (Template string)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'SUBJECT_TEMPLATE';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'หัวข้อสำหรับ InApp / Push (Template string)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'TITLE_TEMPLATE';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'เนื้อหาสำหรับ InApp / Push (Template string)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'BODY_TEMPLATE';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'1 = เก็บ rendered content, 0 = ไม่เก็บ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'STORE_CONTENT';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'0 = ปกติ, 1 = ลบแล้ว (Soft Delete)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_TEMPLATE', @level2type=N'COLUMN',@level2name=N'DEL_FLAG';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE UNIQUE NONCLUSTERED INDEX [UQ_NOTIFICATION_TEMPLATE_CODE_CHANNEL]
    ON [agrimap_app].[NOTIFICATION_TEMPLATE](
        [TEMPLATE_CODE] ASC, [CHANNEL_ID] ASC
    )
    WHERE [DEL_FLAG] = 0
GO

CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_TEMPLATE_CODE]
    ON [agrimap_app].[NOTIFICATION_TEMPLATE]([TEMPLATE_CODE] ASC)
    WHERE [DEL_FLAG] = 0
GO

CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_TEMPLATE_CHANNEL]
    ON [agrimap_app].[NOTIFICATION_TEMPLATE]([CHANNEL_ID] ASC)
    WHERE [DEL_FLAG] = 0
GO
