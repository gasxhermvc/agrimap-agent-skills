USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[NOTIFICATION_CONTENT]    Script Date: 2026-03-23 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[NOTIFICATION_CONTENT](

    -- Primary Key
    [ID]				NUMERIC(38,0)		IDENTITY(1,1)	NOT NULL,

    -- Reference Columns (FK)
    [MESSAGE_ID]		NUMERIC(38,0)						NOT NULL,	-- FK -> NOTIFICATION_MESSAGE
    [CHANNEL_ID]		INT									NOT NULL,	-- FK -> LUT_NOTI_CHANNEL

    -- Business Data
    [TITLE]				NVARCHAR(255)						NOT NULL,	-- หัวข้อที่ Render แล้ว
    [BODY]				NVARCHAR(MAX)						NOT NULL,	-- เนื้อหาที่ Render แล้ว

    -- Audit Columns
    [DATE_CREATED]		DATETIME2(7)						NOT NULL,

    CONSTRAINT [PK_NOTIFICATION_CONTENT] PRIMARY KEY CLUSTERED
    (
        [ID] ASC
    ) WITH (
        PAD_INDEX = OFF,
        STATISTICS_NORECOMPUTE = OFF,
        IGNORE_DUP_KEY = OFF,
        ALLOW_ROW_LOCKS = ON,
        ALLOW_PAGE_LOCKS = ON
    ) ON [PRIMARY],

    CONSTRAINT [UQ_NOTIFICATION_CONTENT_MESSAGE_CHANNEL] UNIQUE NONCLUSTERED
    (
        [MESSAGE_ID] ASC, [CHANNEL_ID] ASC
    )

) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- =============================================
-- Default Values
-- =============================================
ALTER TABLE [agrimap_app].[NOTIFICATION_CONTENT]
ADD DEFAULT (GETDATE()) FOR [DATE_CREATED]
GO

-- =============================================
-- Foreign Keys
-- =============================================
ALTER TABLE [agrimap_app].[NOTIFICATION_CONTENT] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_CONTENT_NOTIFICATION_MESSAGE]
FOREIGN KEY ([MESSAGE_ID])
REFERENCES [agrimap_app].[NOTIFICATION_MESSAGE]([ID])
ON UPDATE CASCADE
GO

ALTER TABLE [agrimap_app].[NOTIFICATION_CONTENT] WITH CHECK
ADD CONSTRAINT [FK_NOTIFICATION_CONTENT_LUT_NOTI_CHANNEL]
FOREIGN KEY ([CHANNEL_ID])
REFERENCES [agrimap_app].[LUT_NOTI_CHANNEL]([ID])
ON UPDATE NO ACTION
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส ID ของ Notification Content (Auto Increment)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_CONTENT', @level2type=N'COLUMN',@level2name=N'ID';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'FK -> NOTIFICATION_MESSAGE: รหัส Message ที่ Content นี้เป็นของ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_CONTENT', @level2type=N'COLUMN',@level2name=N'MESSAGE_ID';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'FK -> LUT_NOTI_CHANNEL: ช่องทางที่ Render Content สำหรับ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_CONTENT', @level2type=N'COLUMN',@level2name=N'CHANNEL_ID';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'หัวข้อ Notification ที่ Render จาก Template แล้ว' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_CONTENT', @level2type=N'COLUMN',@level2name=N'TITLE';
GO
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'เนื้อหา Notification ที่ Render จาก Template แล้ว' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'NOTIFICATION_CONTENT', @level2type=N'COLUMN',@level2name=N'BODY';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE NONCLUSTERED INDEX [IX_NOTIFICATION_CONTENT_MESSAGE_CHANNEL]
    ON [agrimap_app].[NOTIFICATION_CONTENT]([MESSAGE_ID] ASC, [CHANNEL_ID] ASC)
GO
