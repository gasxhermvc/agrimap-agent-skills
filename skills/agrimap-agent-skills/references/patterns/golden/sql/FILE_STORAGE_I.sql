USE [AgriMapDB]
GO

/****** Object:  StoredProcedure [agrimap_app].[FILE_STORAGE_I]    Script Date: [<DATE_CREATED>] ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author       : AgriMapDB Team Member
-- Create date  : 2026-03-28 14:17:00
-- Description  : 
-- Data test    : 
--		@PI_FILE_LISTS = N'FILE_ID|FILE_NAME|FILE_RENAME|EXTENSION|MIME_TYPE|FILE_PATH|FILE_SOURCE|SIZE|DATE_CREATED|SESSION_USER_ID^FILE_ID|FILE_NAME|FILE_RENAME|EXTENSION|MIME_TYPE|FILE_PATH|FILE_SOURCE|SIZE|DATE_CREATED|SESSION_USER_ID^...'
--		@PI_FILE_LISTS = N'111|test.png|133a2f3d26b8db1c5a7e28781a296f8bb12b8d54.png|png|image/png|test/image|DEFAULT|1000|2025-05-13 14:17:00|system^...'
-- Modified by  : 
-- Modified date: 
-- Description  : 
-- =============================================
CREATE PROCEDURE [agrimap_app].[FILE_STORAGE_I]
    @PI_FILE_LISTS			NVARCHAR(MAX) = NULL,

    @PO_STATUS				INT				OUTPUT,
    @PO_STATUS_MSG			NVARCHAR(4000)	OUTPUT,
    @PO_ERROR_DETAIL		NVARCHAR(4000)	OUTPUT

AS
DECLARE @V_SPLIT_ROW		NVARCHAR(10);
DECLARE @V_SPLIT_COL		NVARCHAR(10);

DECLARE @V_ROWS				CURSOR;
DECLARE @V_COLS				CURSOR;

DECLARE @V_ROW_VALUE		NVARCHAR(MAX);
DECLARE @V_COL_VALUE		NVARCHAR(MAX);

DECLARE @I					INT;
DECLARE @FILE_ID			NVARCHAR(100);
DECLARE @FILE_NAME			NVARCHAR(100);
DECLARE @FILE_RENAME		NVARCHAR(100);
DECLARE @EXTENSION			NVARCHAR(10);
DECLARE @MIME_TYPE			NVARCHAR(100);
DECLARE @FILE_PATH			NVARCHAR(255);
DECLARE @FILE_SOURCE		NVARCHAR(100);
DECLARE @SIZE				DECIMAL(18, 2);
DECLARE @DATE_CREATED		DATETIME;
DECLARE @SESSION_USER_ID	NVARCHAR(255);

BEGIN
    SET NOCOUNT ON;
    SET @PO_STATUS = 1;
    SET @PO_STATUS_MSG = '';
    SET @PO_ERROR_DETAIL = '';
    SET @V_SPLIT_ROW = agrimap_app.FN_ROW_SPLIT();
    SET @V_SPLIT_COL = agrimap_app.FN_COL_SPLIT();

    BEGIN TRANSACTION;
    BEGIN TRY

        IF (@PI_FILE_LISTS IS NULL OR LTRIM(RTRIM(@PI_FILE_LISTS)) = '')
            THROW 50001, 'invalid_parameter', 1;

        SET
            @V_ROWS = CURSOR FOR SELECT [VALUE] FROM agrimap_app.FN_SPLIT(@PI_FILE_LISTS, @V_SPLIT_ROW);
        OPEN @V_ROWS;
        FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;
        WHILE @@FETCH_STATUS = 0
            BEGIN
                SET @I = 0;
                SET @FILE_ID = '';
                SET @FILE_NAME = '';
                SET @FILE_RENAME = '';
                SET @EXTENSION = '';
                SET @MIME_TYPE = '';
                SET @FILE_PATH = '';
                SET @FILE_SOURCE = '';
                SET @SIZE = 0;
                SET @DATE_CREATED = GETDATE();
                SET @SESSION_USER_ID = '';
                SET
                    @V_COLS = CURSOR FOR SELECT [VALUE] FROM agrimap_app.FN_SPLIT(@V_ROW_VALUE, @V_SPLIT_COL);
                OPEN @V_COLS;
                FETCH NEXT FROM @V_COLS INTO @V_COL_VALUE;
                WHILE @@FETCH_STATUS = 0
                    BEGIN
                        SET @I = @I + 1;
                        ---FILE_ID|FILE_NAME|FILE_RENAME|EXTENSION|MIME_TYPE|FILE_PATH|FILE_SOURCE|SIZE|DATE_CREATED|SESSION_USER_ID
                        IF (@I = 1) SET @FILE_ID = @V_COL_VALUE;
                        IF (@I = 2) SET @FILE_NAME = @V_COL_VALUE;
                        IF (@I = 3) SET @FILE_RENAME = @V_COL_VALUE;
                        IF (@I = 4) SET @EXTENSION = @V_COL_VALUE;
                        IF (@I = 5) SET @MIME_TYPE = @V_COL_VALUE;
                        IF (@I = 6) SET @FILE_PATH = @V_COL_VALUE;
                        IF (@I = 7) SET @FILE_SOURCE = @V_COL_VALUE;
                        IF (@I = 8)
                            BEGIN
                                IF (ISNUMERIC(@V_COL_VALUE) = 1)
                                    SET
                                        @SIZE = CAST(@V_COL_VALUE AS DECIMAL(28, 4));
                                ELSE
                                    THROW 50001, 'invalid_file_size', 1;
                            END
                        IF
                            (@I = 9)
                            SET
                                @DATE_CREATED = DATEADD(SECOND, CAST(@V_COL_VALUE AS BIGINT) / 1000, '19700101 00:00:00:000');
                        IF (@I = 10) SET @SESSION_USER_ID = @V_COL_VALUE;
                        FETCH NEXT FROM @V_COLS INTO @V_COL_VALUE;
                    END
                CLOSE @V_COLS;
                DEALLOCATE @V_COLS;

                IF (
                    ISNULL(@FILE_ID, '') = ''
                    OR ISNULL(@FILE_NAME, '') = ''
                    OR ISNULL(@FILE_RENAME, '') = ''
                    OR ISNULL(@EXTENSION, '') = ''
                    OR ISNULL(@MIME_TYPE, '') = ''
                    OR ISNULL(@FILE_SOURCE, '') = '' OR @DATE_CREATED IS NULL OR ISNULL(@SESSION_USER_ID, '') = ''
                )
                    THROW 50001, 'invalid_parameter', 1;

                INSERT INTO [FILE_STORAGE] (
                    [FILE_ID],
                    [FILE_NAME],
                    [FILE_RENAME],
                    [EXTENSION],
                    [MIME_TYPE],
                    [SIZE],
                    [FILE_PATH],
                    [FILE_SOURCE],
                    [DEL_FLAG],
                    [DATE_CREATED],
                    [USER_CREATED]
                ) VALUES (
                    @FILE_ID,
                    @FILE_NAME,
                    @FILE_RENAME,
                    @EXTENSION,
                    @MIME_TYPE,
                    @SIZE,
                    @FILE_PATH,
                    @FILE_SOURCE,
                    0,
                    @DATE_CREATED,
                    @SESSION_USER_ID
                );

                FETCH NEXT FROM @V_ROWS INTO @V_ROW_VALUE;
            END
        CLOSE @V_ROWS;
        DEALLOCATE @V_ROWS;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @PO_STATUS = 0;
        SET @PO_STATUS_MSG = ERROR_MESSAGE();
        SET @PO_ERROR_DETAIL = agrimap_app.FN_GET_ERROR_MESSAGE(
            ERROR_NUMBER(),
            (SELECT OBJECT_NAME(@@PROCID)),
            ERROR_LINE(),
            ERROR_MESSAGE()
        );
    END CATCH
END
GO
