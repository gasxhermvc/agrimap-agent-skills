USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[LUT_NOTI_CHANNEL]    Script Date: 2026-03-23 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[LUT_NOTI_CHANNEL](

	-- Primary Key
	[ID]		INT				IDENTITY(1,1)	NOT NULL,

	-- Business Data
	[DESCR]		NVARCHAR(50)				NOT NULL,

 CONSTRAINT [PK_LUT_NOTI_CHANNEL] PRIMARY KEY CLUSTERED
(
	[ID] ASC
) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]

) ON [PRIMARY]
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัสช่องทางการส่ง Notification' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'LUT_NOTI_CHANNEL', @level2type=N'COLUMN',@level2name=N'ID';
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'คำอธิบายช่องทาง เช่น Email, Push, InApp, Microsoft Teams' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'LUT_NOTI_CHANNEL', @level2type=N'COLUMN',@level2name=N'DESCR';
GO

-- =============================================
-- Default Data
-- =============================================
SET IDENTITY_INSERT [agrimap_app].[LUT_NOTI_CHANNEL] ON

INSERT INTO [agrimap_app].[LUT_NOTI_CHANNEL] ([ID], [DESCR]) VALUES (1, N'Email');
INSERT INTO [agrimap_app].[LUT_NOTI_CHANNEL] ([ID], [DESCR]) VALUES (2, N'Push');
INSERT INTO [agrimap_app].[LUT_NOTI_CHANNEL] ([ID], [DESCR]) VALUES (3, N'InApp');
INSERT INTO [agrimap_app].[LUT_NOTI_CHANNEL] ([ID], [DESCR]) VALUES (4, N'Microsoft Teams');

SET IDENTITY_INSERT [agrimap_app].[LUT_NOTI_CHANNEL] OFF
GO
