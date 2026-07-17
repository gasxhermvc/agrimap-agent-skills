USE [AgriMapDB]
GO

/****** Object:  Table [agrimap_app].[AUTH_FLOW_TRANSACTION]    Script Date: 26/5/2569 00:00:00 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [agrimap_app].[AUTH_FLOW_TRANSACTION](

    -- Primary Key
    -- รหัสธุรกรรม (Auto Increment)
    [ID]				NUMERIC(38,0)		IDENTITY(1,1)	NOT NULL,

    -- Business Keys
    -- FK -> [agrimap_app].[AUTH_FLOW].[ID]
    [AUTH_FLOW_ID]		NVARCHAR(100)						NOT NULL,

    -- Business Data
    -- FK -> [agrimap_app].[AUTH_APP].[APP_ID]
    [APP_ID]			NVARCHAR(100)						NOT NULL,
    -- Provider ที่ใช้ OAuth เช่น code, thaid
    [PROVIDER]			NVARCHAR(100)						NOT NULL,
    -- รหัสอุปกรณ์ที่ทำธุรกรรม เช่น GUID หรือ MAC Address
    [DEVICE_ID]			NVARCHAR(255)						NULL,
    -- User-Agent ของ Browser/App ที่ทำธุรกรรม
    [USER_AGENT]		NVARCHAR(255)						NULL,

    -- Audit Columns
    [DATE_CREATED]		DATETIME2(7)						NOT NULL,	-- วันที่สร้างข้อมูล
    [DATE_MODIFIED]		DATETIME2(7)						NULL,		-- วันที่แก้ไขล่าสุด

    CONSTRAINT [PK_AUTH_FLOW_TRANSACTION] PRIMARY KEY CLUSTERED
    (
        [ID] ASC
    ) ON [PRIMARY]
) ON [PRIMARY]
GO

-- =============================================
-- Default Constraints
-- =============================================
ALTER TABLE [agrimap_app].[AUTH_FLOW_TRANSACTION] ADD CONSTRAINT [DF_AUTH_FLOW_TRANSACTION_DATE_CREATED] DEFAULT (
    GETDATE()
) FOR [DATE_CREATED];
GO

-- =============================================
-- Foreign Key Constraints
-- =============================================
ALTER TABLE [agrimap_app].[AUTH_FLOW_TRANSACTION] WITH CHECK ADD CONSTRAINT [FK_AUTH_FLOW_TRANSACTION_AUTH_FLOW] FOREIGN KEY(
    [AUTH_FLOW_ID]
)
REFERENCES [agrimap_app].[AUTH_FLOW] ([ID]);
GO
ALTER TABLE [agrimap_app].[AUTH_FLOW_TRANSACTION] CHECK CONSTRAINT [FK_AUTH_FLOW_TRANSACTION_AUTH_FLOW];
GO

ALTER TABLE [agrimap_app].[AUTH_FLOW_TRANSACTION]
WITH CHECK
ADD CONSTRAINT [FK_AUTH_FLOW_TRANSACTION_AUTH_APP_PROVIDER]
FOREIGN KEY ([APP_ID], [PROVIDER])
REFERENCES [agrimap_app].[AUTH_APP] ([APP_ID], [PROVIDER]);
GO

ALTER TABLE [agrimap_app].[AUTH_FLOW_TRANSACTION]
CHECK CONSTRAINT [FK_AUTH_FLOW_TRANSACTION_AUTH_APP_PROVIDER];
GO

-- =============================================
-- Extended Properties
-- =============================================
EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสธุรกรรม (Auto Increment)' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส Auth Flow FK -> AUTH_FLOW.ID' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'AUTH_FLOW_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัส Application FK -> AUTH_APP.APP_ID' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'APP_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'รหัสอุปกรณ์ที่ทำธุรกรรม เช่น GUID หรือ MAC Address' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'DEVICE_ID';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'User-Agent ของ Browser หรือ Application ที่ทำธุรกรรม' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'USER_AGENT';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่สร้างข้อมูล' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'DATE_CREATED';
GO

EXEC sys.sp_addextendedproperty
    @name=N'MS_Description', @value=N'วันที่แก้ไขล่าสุด' , @level0type=N'SCHEMA',@level0name=N'agrimap_app', @level1type=N'TABLE',@level1name=N'AUTH_FLOW_TRANSACTION', @level2type=N'COLUMN',@level2name=N'DATE_MODIFIED';
GO

-- =============================================
-- Indexes
-- =============================================
CREATE NONCLUSTERED INDEX [IX_AUTH_FLOW_TRANSACTION_AUTH_FLOW_ID]
    ON [agrimap_app].[AUTH_FLOW_TRANSACTION] ([AUTH_FLOW_ID])
    INCLUDE ([APP_ID], [PROVIDER], [DEVICE_ID], [DATE_CREATED]);
GO
