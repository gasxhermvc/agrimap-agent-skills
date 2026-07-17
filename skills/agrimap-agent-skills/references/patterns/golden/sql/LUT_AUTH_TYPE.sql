USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[LUT_AUTH_TYPE]    Script Date: 2026-03-18 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[LUT_AUTH_TYPE](

    -- Primary Key
    [ID] [int] NOT NULL,

    -- Business Data
    [DESCR] [nvarchar](50) NOT NULL,
    [NOTE] [nvarchar](500) NULL,

    CONSTRAINT [PK_LUT_AUTH_TYPE] PRIMARY KEY CLUSTERED
    (
        [ID] ASC
    )WITH (
        PAD_INDEX = OFF,
        STATISTICS_NORECOMPUTE = OFF,
        IGNORE_DUP_KEY = OFF,
        ALLOW_ROW_LOCKS = ON,
        ALLOW_PAGE_LOCKS = ON,
        OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
    ) ON [PRIMARY]

) ON [PRIMARY]
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสประเภทการ Auth สำหรับ Content Proxy' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'LUT_AUTH_TYPE', @level2type=N'COLUMN',@level2name=N'ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ชื่อประเภทการ Auth (NONE, APP_PROXY, ARCGIS_TOKEN, BEARER_STATIC, OAUTH2_CLIENT_CREDENTIALS)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'LUT_AUTH_TYPE', @level2type=N'COLUMN',@level2name=N'DESCR';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'คำอธิบายประเภทการ Auth' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'LUT_AUTH_TYPE', @level2type=N'COLUMN',@level2name=N'NOTE';
GO

-- =============================================
-- Default Data
-- =============================================
INSERT INTO [agrimap_app].[LUT_AUTH_TYPE] ([ID], [DESCR], [NOTE]) VALUES (
    1, N'NONE', N'ไม่มีการ Auth ใด ๆ (Public Service)'
);
GO
INSERT INTO [agrimap_app].[LUT_AUTH_TYPE] ([ID], [DESCR], [NOTE]) VALUES (
    2,
    N'APP_PROXY',
    N'ส่งต่อผ่าน AgriMap Proxy Service (agmws-proxy-netcore) หลักการ proxy_url?your_url=encoded_target_url'
);
GO
INSERT INTO [agrimap_app].[LUT_AUTH_TYPE] ([ID], [DESCR], [NOTE]) VALUES (
    3,
    N'ARCGIS_TOKEN',
    N'ใช้ generateToken ของ ArcGIS Server แล้ว append token ไปใน query string หรือ Authorization header'
);
GO
INSERT INTO [agrimap_app].[LUT_AUTH_TYPE] ([ID], [DESCR], [NOTE]) VALUES (
    4,
    N'BEARER_STATIC',
    N'ใช้ Bearer Token แบบ Static ที่กำหนดไว้ใน parameters ส่งใน Authorization header'
);
GO
INSERT INTO [agrimap_app].[LUT_AUTH_TYPE] ([ID], [DESCR], [NOTE]) VALUES (
    5,
    N'OAUTH2_CLIENT_CREDENTIALS',
    N'ใช้ OAuth2 Client Credentials Flow สำหรับ Machine-to-Machine Auth (Phase 2)'
);
GO
