USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[CONTENT]    Script Date: {Date.Now:yyyy-MM-dd HH:mm:ss} ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[CONTENT](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[CONTENT_ID] [nvarchar](50) NOT NULL,
	[NAME] [nvarchar](500) NOT NULL,
	[USER_CREATED] [numeric](38, 0) NOT NULL,
	[USER_MODIFIED] [numeric](38, 0) NULL,
	[DATE_CREATED] [datetime2](7) NOT NULL,
	[DATE_MODIFIED] [datetime2](7) NULL,
	[CONTENT_TYPE_ID] [int] NOT NULL,
	[DEL_FLAG] [bit] NOT NULL,
	[PARENT_ID] [int] NULL,
	[FILE_SIZE] [bigint] NULL,
 CONSTRAINT [PK_CONTENT] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

-- =============================================
-- Defaults
-- =============================================
ALTER TABLE [agrimap_app].[CONTENT] ADD DEFAULT (GETDATE()) FOR [DATE_CREATED];
GO

ALTER TABLE [agrimap_app].[CONTENT] ADD DEFAULT (0) FOR [DEL_FLAG];
GO

-- =============================================
-- Foreign Keys
-- =============================================
ALTER TABLE [agrimap_app].[CONTENT] WITH CHECK ADD CONSTRAINT [FK_CONTENT_LUT_CONTENT_TYPE] FOREIGN KEY([CONTENT_TYPE_ID])
REFERENCES [agrimap_app].[LUT_CONTENT_TYPE] ([ID])
ON UPDATE CASCADE;
GO

ALTER TABLE [agrimap_app].[CONTENT] CHECK CONSTRAINT [FK_CONTENT_LUT_CONTENT_TYPE];
GO

ALTER TABLE [agrimap_app].[CONTENT] WITH CHECK ADD CONSTRAINT [FK_CONTENT_PARENT] FOREIGN KEY([PARENT_ID])
REFERENCES [agrimap_app].[CONTENT] ([ID]);
GO

ALTER TABLE [agrimap_app].[CONTENT] CHECK CONSTRAINT [FK_CONTENT_PARENT];
GO

ALTER TABLE [agrimap_app].[CONTENT] WITH CHECK ADD CONSTRAINT [FK_CONTENT_UM_USER_CREATED] FOREIGN KEY([USER_CREATED])
REFERENCES [agrimap_app].[UM_USER] ([USER_ID]);
GO

ALTER TABLE [agrimap_app].[CONTENT] CHECK CONSTRAINT [FK_CONTENT_UM_USER_CREATED];
GO

ALTER TABLE [agrimap_app].[CONTENT] WITH CHECK ADD CONSTRAINT [FK_CONTENT_UM_USER_MODIFIED] FOREIGN KEY([USER_MODIFIED])
REFERENCES [agrimap_app].[UM_USER] ([USER_ID]);
GO

ALTER TABLE [agrimap_app].[CONTENT] CHECK CONSTRAINT [FK_CONTENT_UM_USER_MODIFIED];
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัสอ้างอิงภายใน (Auto Increment)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'ID';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัสเนื้อหา UUID สำหรับอ้างอิงภายนอก' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'CONTENT_ID';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ชื่อเนื้อหา' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'NAME';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัสผู้สร้างรายการ อ้างอิงจาก UM_USER' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'USER_CREATED';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัสผู้แก้ไขรายการ อ้างอิงจาก UM_USER' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'USER_MODIFIED';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'วันที่สร้างรายการ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'DATE_CREATED';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'วันที่แก้ไขรายการ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'DATE_MODIFIED';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ประเภทเนื้อหา อ้างอิงจาก LUT_CONTENT_TYPE' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'CONTENT_TYPE_ID';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'สถานะการลบ (0 = ไม่ลบ, 1 = ลบแล้ว)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'DEL_FLAG';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัสเนื้อหาแม่ อ้างอิงจาก CONTENT.ID (null = Root)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'PARENT_ID';
GO

EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ขนาดไฟล์ (หน่วย: bytes) null = ไม่มีไฟล์แนบ (เช่น folder)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'CONTENT', @level2type=N'COLUMN',@level2name=N'FILE_SIZE';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE UNIQUE NONCLUSTERED INDEX [IX_CONTENT_CONTENT_ID] ON [agrimap_app].[CONTENT]
(
	[CONTENT_ID] ASC
)
ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_CONTENT_NAME] ON [agrimap_app].[CONTENT]
(
	[NAME] ASC
)
ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_CONTENT_USER_CREATED] ON [agrimap_app].[CONTENT]
(
	[USER_CREATED] ASC
)
ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_CONTENT_DATE_CREATED] ON [agrimap_app].[CONTENT]
(
	[DATE_CREATED] ASC
)
ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_CONTENT_CONTENT_TYPE_ID] ON [agrimap_app].[CONTENT]
(
	[CONTENT_TYPE_ID] ASC
)
INCLUDE ([NAME], [PARENT_ID], [DEL_FLAG])
ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_CONTENT_DEL_FLAG] ON [agrimap_app].[CONTENT]
(
	[DEL_FLAG] ASC
)
ON [PRIMARY];
GO

CREATE NONCLUSTERED INDEX [IX_CONTENT_PARENT_ID] ON [agrimap_app].[CONTENT]
(
	[PARENT_ID] ASC
)
INCLUDE ([NAME], [CONTENT_TYPE_ID], [DEL_FLAG])
ON [PRIMARY];
GO
