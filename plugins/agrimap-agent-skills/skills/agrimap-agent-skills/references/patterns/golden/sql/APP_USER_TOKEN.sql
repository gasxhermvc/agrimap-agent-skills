USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[APP_USER_TOKEN]    Script Date: {Date.Now:yyyy-MM-dd HH:mm:ss} ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[APP_USER_TOKEN](
    [USER_ID] [numeric](38, 0) NOT NULL,
    [NONCE] [varchar](50) NOT NULL,
    [REFRESH_TOKEN] [varchar](50) NOT NULL,
    [CLIENT_ID] [varchar](50) NOT NULL,
    [DEVICE_ID] [nvarchar](50) NOT NULL,
    [CHECK_SUM] [varchar](100) NOT NULL,
    [FCM_TOKEN] [varchar](200) NULL,
    [DATE_CREATED] [datetime2](7) NOT NULL,
    [DATE_EXPIRED] [datetime2](7) NOT NULL,
    [DATE_MODIFIED] [datetime2](7) NULL,
    [USER_MODIFIED] [nvarchar](50) NULL,
    [DEL_FLAG] [bit] NOT NULL,
    [REVOKE_FLAG] [bit] NOT NULL,
    CONSTRAINT [PK_APP_USER_TOKEN] PRIMARY KEY CLUSTERED 
    (
        [USER_ID] ASC,
        [NONCE] ASC
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
-- Defaults
-- =============================================
ALTER TABLE [agrimap_app].[APP_USER_TOKEN] ADD DEFAULT (0) FOR [DEL_FLAG];
GO

ALTER TABLE [agrimap_app].[APP_USER_TOKEN] ADD  CONSTRAINT [DF_APP_USER_TOKEN_REVOKE_FLAG]  DEFAULT (
    (0)
) FOR [REVOKE_FLAG]
GO

-- =============================================
-- Foreign Keys
-- =============================================
ALTER TABLE [agrimap_app].[APP_USER_TOKEN] WITH CHECK ADD CONSTRAINT [FK_APP_USER_TOKEN_UM_USER] FOREIGN KEY(
    [USER_ID]
)
REFERENCES [agrimap_app].[UM_USER] ([USER_ID])
ON UPDATE CASCADE
ON DELETE CASCADE;
GO

ALTER TABLE [agrimap_app].[APP_USER_TOKEN] CHECK CONSTRAINT [FK_APP_USER_TOKEN_UM_USER];
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสผู้ใช้งาน' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'USER_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ค่า Nonce สำหรับระบุ Token' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'NONCE';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'Refresh Token สำหรับขอ Token ใหม่' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'REFRESH_TOKEN';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส Client ที่เชื่อมต่อ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'CLIENT_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสอุปกรณ์' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'DEVICE_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ค่า Checksum สำหรับตรวจสอบความถูกต้อง' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'CHECK_SUM';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'Firebase Cloud Messaging Token' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'FCM_TOKEN';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่สร้าง Token' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'DATE_CREATED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่ Token หมดอายุ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'DATE_EXPIRED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่แก้ไขรายการ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'DATE_MODIFIED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ผู้แก้ไขรายการ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'USER_MODIFIED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'สถานะการลบ (0 = ไม่ลบ, 1 = ลบแล้ว)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'DEL_FLAG';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'สถานะการเพิกถอน (0 = ไม่เพิกถอน, 1 = เพิกถอนแล้ว)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'APP_USER_TOKEN', @level2type=N'COLUMN',@level2name=N'REVOKE_FLAG';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE NONCLUSTERED INDEX [IX_APP_USER_TOKEN_ACTIVE]
    ON [agrimap_app].[APP_USER_TOKEN]
    (
        [USER_ID] ASC,
        [DEL_FLAG] ASC
    )
    INCLUDE ([DATE_EXPIRED], [CLIENT_ID], [DEVICE_ID])
    WHERE [DEL_FLAG] = 0
    ON [PRIMARY];
GO

-- ค้นหาด้วย REFRESH_TOKEN (ใช้ตอน refresh token)
CREATE NONCLUSTERED INDEX [IX_APP_USER_TOKEN_REFRESH]
    ON [agrimap_app].[APP_USER_TOKEN]
    (
        [REFRESH_TOKEN] ASC,
        [DEL_FLAG] ASC
    )
    INCLUDE ([USER_ID], [NONCE], [DATE_EXPIRED])
    WHERE [DEL_FLAG] = 0
    ON [PRIMARY];
GO

-- ค้นหาด้วย FCM_TOKEN (ใช้ตอนส่ง push notification)
CREATE NONCLUSTERED INDEX [IX_APP_USER_TOKEN_FCM]
    ON [agrimap_app].[APP_USER_TOKEN]
    (
        [FCM_TOKEN] ASC,
        [DEL_FLAG] ASC
    )
    INCLUDE ([USER_ID])
    WHERE [FCM_TOKEN] IS NOT NULL AND [DEL_FLAG] = 0
    ON [PRIMARY];
GO

-- ค้นหาด้วย NONCE สำหรับ REVOKE และ UNREGISTER_FCM (รายการที่ยังใช้งานได้เท่านั้น)
CREATE NONCLUSTERED INDEX [IX_APP_USER_TOKEN_NONCE_REVOKE]
    ON [agrimap_app].[APP_USER_TOKEN]
    (
        [NONCE] ASC,
        [DEL_FLAG] ASC,
        [REVOKE_FLAG] ASC
    )
    INCLUDE ([USER_ID], [REFRESH_TOKEN], [FCM_TOKEN])
    WHERE [DEL_FLAG] = 0 AND [REVOKE_FLAG] = 0
    ON [PRIMARY];
GO
