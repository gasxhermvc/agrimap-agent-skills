USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[AUTH_FLOW]    Script Date: 26/5/2569 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[AUTH_FLOW](

    -- Primary Key
    [ID]				NVARCHAR(100)						NOT NULL,	-- รหัส Auth Flow (GUID)

    -- Business Keys
    [USER_ID]			NUMERIC(38,0)						NOT NULL,	-- FK -> [agrimap_app].[UM_USER]
    -- Cookie ID ที่ผูกกับ Auth Flow นี้
    [COOKIE_ID]			NVARCHAR(255)						NOT NULL,

    -- Business Data
    [APP_ID]			NVARCHAR(100)						NOT NULL,	-- FK -> [agrimap_app].[AUTH_APP]
    -- Provider ที่ใช้ OAuth เช่น code, thaid
    [PROVIDER]			NVARCHAR(100)						NOT NULL,
    -- วัตถุประสงค์ เช่น login, register, forgot_password, forgot_pin
    [PURPOSE]			NVARCHAR(100)						NOT NULL,
    -- Prompt เช่น select_account, consent
    [PROMPT]			NVARCHAR(100)						NOT NULL,
    -- ข้อมูล Query String เพิ่มเติม เช่น client_id=xxx&scope=openid&state=xxx
    [PAYLOAD]			NVARCHAR(MAX)						NULL,
    -- รหัสอุปกรณ์ เช่น GUID หรือ MAC Address
    [DEVICE_ID]			NVARCHAR(255)						NULL,
    [USER_TYPE_ID]		INT									NOT NULL,	-- FK -> [agrimap_app].[LUT_USER_TYPE]
    [ORG_ID]			INT									NOT NULL,	-- FK -> [agrimap_app].[LUT_ORGANIZATION]
    [DATE_EXPIRED]		DATETIME2(7)						NOT NULL,	-- วันที่หมดอายุของ Auth Flow
    [COOKIE_EXPIRED]	DATETIME2(7)						NOT NULL,	-- วันที่หมดอายุของ Cookie
    [REVOKED]			BIT									NOT NULL,	-- 0 = Active, 1 = Revoked

    -- Audit Columns
    [DATE_CREATED]		DATETIME2(7)						NOT NULL,	-- วันที่สร้างข้อมูล
    [DATE_MODIFIED]		DATETIME2(7)						NULL,		-- วันที่แก้ไขล่าสุด

    -- Soft Delete
    [DEL_FLAG]			BIT									NOT NULL,	-- 0 = Active, 1 = Deleted

    CONSTRAINT [PK_AUTH_FLOW] PRIMARY KEY CLUSTERED
    (
        [ID] ASC
    ) ON [PRIMARY]
) TEXTIMAGE_ON [PRIMARY]
GO

-- =============================================
-- Default Constraints
-- =============================================
ALTER TABLE [agrimap_app].[AUTH_FLOW] ADD CONSTRAINT [DF_AUTH_FLOW_DATE_CREATED] DEFAULT (
    GETDATE()
) FOR [DATE_CREATED];
GO

ALTER TABLE [agrimap_app].[AUTH_FLOW] ADD CONSTRAINT [DF_AUTH_FLOW_REVOKED] DEFAULT (
    0
) FOR [REVOKED];
GO

ALTER TABLE [agrimap_app].[AUTH_FLOW] ADD CONSTRAINT [DF_AUTH_FLOW_DEL_FLAG] DEFAULT (
    0
) FOR [DEL_FLAG];
GO

-- =============================================
-- Foreign Key Constraints
-- =============================================
ALTER TABLE [agrimap_app].[AUTH_FLOW] WITH CHECK ADD CONSTRAINT [FK_AUTH_FLOW_UM_USER] FOREIGN KEY(
    [USER_ID]
)
REFERENCES [agrimap_app].[UM_USER] ([USER_ID]);
GO
ALTER TABLE [agrimap_app].[AUTH_FLOW] CHECK CONSTRAINT [FK_AUTH_FLOW_UM_USER];
GO

ALTER TABLE [agrimap_app].[AUTH_FLOW]
WITH CHECK
ADD CONSTRAINT [FK_AUTH_FLOW_AUTH_APP_PROVIDER]
FOREIGN KEY ([APP_ID], [PROVIDER])
REFERENCES [agrimap_app].[AUTH_APP] ([APP_ID], [PROVIDER]);
GO

ALTER TABLE [agrimap_app].[AUTH_FLOW]
CHECK CONSTRAINT [FK_AUTH_FLOW_AUTH_APP_PROVIDER];
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส Auth Flow (GUID) ใช้ระบุ Authentication Flow นี้โดยเฉพาะ' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสผู้ใช้งาน FK -> UM_USER.USER_ID' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'USER_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'Cookie ID ที่ผูกกับ Auth Flow นี้ ใช้ระบุ Session บนเครื่องของผู้ใช้' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'COOKIE_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส Application FK -> AUTH_APP.APP_ID' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'APP_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'Provider ที่ใช้ OAuth เช่น code, thaid' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'PROVIDER';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วัตถุประสงค์ของ Auth Flow เช่น login, register, forgot_password, forgot_pin' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'PURPOSE';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'Prompt ที่แสดงให้ผู้ใช้ เช่น select_account, consent' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'PROMPT';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ข้อมูล Query String เพิ่มเติม เช่น client_id, scope, state เก็บเป็น JSON หรือ Query String' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'PAYLOAD';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสอุปกรณ์ที่ใช้ Authentication เช่น GUID หรือ MAC Address' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'DEVICE_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'ประเภทผู้ใช้งาน FK -> LUT_USER_TYPE.ID' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'USER_TYPE_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสองค์กร FK -> LUT_ORGANIZATION.ID' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'ORG_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่หมดอายุของ Auth Flow (ID)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'DATE_EXPIRED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่หมดอายุของ Cookie ที่ผูกกับ Auth Flow' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'COOKIE_EXPIRED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'สถานะการยกเลิก (0 = Active, 1 = Revoked)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'REVOKED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่สร้างข้อมูล' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'DATE_CREATED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่แก้ไขล่าสุด' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'DATE_MODIFIED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'สถานะการลบ (0 = Active, 1 = Deleted)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW', @level2type=N'COLUMN',@level2name=N'DEL_FLAG';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE NONCLUSTERED INDEX [IX_AUTH_FLOW_USER_ID_ACTIVE]
    ON [agrimap_app].[AUTH_FLOW] ([USER_ID])
    INCLUDE (
        [ID],
        [COOKIE_ID],
        [APP_ID],
        [PROVIDER],
        [PURPOSE],
        [DATE_EXPIRED],
        [REVOKED]
    )
    WHERE [DEL_FLAG] = 0 AND [REVOKED] = 0;
GO

CREATE NONCLUSTERED INDEX [IX_AUTH_FLOW_ID]
    ON [agrimap_app].[AUTH_FLOW] ([ID])
    INCLUDE ([USER_ID], [COOKIE_ID], [APP_ID], [DATE_EXPIRED], [REVOKED], [DEL_FLAG]);
GO

CREATE NONCLUSTERED INDEX [IX_AUTH_FLOW_COOKIE_EXPIRED]
    ON [agrimap_app].[AUTH_FLOW] ([COOKIE_EXPIRED])
    WHERE [DEL_FLAG] = 0;
GO
