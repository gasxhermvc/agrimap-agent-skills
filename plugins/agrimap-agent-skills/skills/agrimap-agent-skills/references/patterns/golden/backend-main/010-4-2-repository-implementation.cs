namespace AgriMap.Web.Service.Infrastructure.Persistence.Repositories;

using AgriMap.Web.Service.Shared.Extensions;

public class UserRepository : IUserRepository
{
    private readonly IDbDataAccessService _dbDataAccessService;
    private readonly DataAccessConfiguration _dataAccessConfiguration;
    private readonly IAuthService _authService;
    private readonly IAesService _aesService;
    private readonly IConfiguration _configuration;

    public UserRepository(
        IDbDataAccessService dbDataAccessService,
        DataAccessConfiguration dataAccessConfiguration,
        IAuthService authService,
        IAesService aesService,
        IConfiguration configuration)
    {
        _dbDataAccessService = dbDataAccessService ?? throw new ArgumentNullException(nameof(dbDataAccessService));
        _dataAccessConfiguration = dataAccessConfiguration ?? throw new ArgumentNullException(nameof(dataAccessConfiguration));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _aesService = aesService ?? throw new ArgumentNullException(nameof(aesService));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<(List<UserSearchModel> Data, PaginationMetaModel? Meta)> SearchUserAsync(UserSearchRequestDto request)
    {
        var parameters = new Dictionary<string, object>
        {
            { "keyword", request.Keyword! },
            { "status", request.Status! },
            { "rows", request.Rows },
            { "page", request.Page },
            { "field_name", request.FieldName! },
            { "sorting", request.Sorting! }
        };

        // Src/Shared/Extensions/LoggingExtensions.cs
        _logger.LogProcedureCall(callerName, "um_user_search_q", parameters);

        var result = await _dataAccessConfiguration.CallProcedureAsync(
            _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
            "um_user_search_q",
            parameters);

        if (!result.Success)
        {
            // Src/Shared/Helpers/ProcedureExtensions.cs
            throw result.Message.ToProcedureException(result.GetOutputParameter<string>("error_detail"));
        }

        var data = result.DataTable.ToList<UserSearchModel>();

        PaginationMetaModel? meta = null;
        if (data != null && data.Count > 0)
        {
            var metaList = result.GetOutputParameter<DataTable>("data2")!.ToList<PaginationMetaModel>();
            meta = metaList.FirstOrDefault();
        }

        return await Task.FromResult((data, meta));
    }

    public async Task<UserDetailModel?> GetUserByIdAsync(int userId)
    {
        var parameters = new Dictionary<string, object>
        {
            { "user_id", userId }
        };

        _logger.LogProcedureCall(callerName, "um_user_q", parameters);

        var result = await _dataAccessConfiguration.CallProcedureAsync(
            _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
            "um_user_q",
            parameters);

        if (!result.Success)
        {
            throw result.Message.ToProcedureException(result.GetOutputParameter<string>("error_detail"));
        }

        var data = result.DataTable.ToList<UserDetailModel>();
        return data.FirstOrDefault();
    }

    public async Task InsertUserAsync(UserCreateRequestDto request)
    {
        var parameters = new Dictionary<string, object>
        {
            { "username", request.Username },
            { "password", _aesService.Encrypt(request.Password, _configuration["AES_KEY"]!) },
            { "title", request.Title! },
            { "name", request.Name },
            { "surname", request.Surname },
            { "dept", request.Dept! },
            { "position", request.Position! },
            { "address", request.Address! },
            { "tel", request.Tel! },
            { "email", request.Email },
            { "id_card", request.IdCard! },
            { "status", request.Status! },
            { "image", request.Image! },
            { "source", request.Source! },
            { "role_list", request.RoleList! },
            { "permission_function_list", request.PermissionFunctionList! },
            { "session_user_id", _authService.UserId()! }
        };

        _logger.LogProcedureCall(callerName, "um_user_i", parameters);

        var result = await _dataAccessConfiguration.CallProcedureAsync(
            _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
            "um_user_i",
            parameters);

        if (!result.Success)
        {
            throw result.Message.ToProcedureException(result.GetOutputParameter<string>("error_detail"));
        }
    }

    public async Task UpdateUserAsync(UserUpdateRequestDto request)
    {
        var parameters = new Dictionary<string, object>
        {
            { "user_id", request.UserId },
            { "title", request.Title! },
            { "name", request.Name! },
            { "surname", request.Surname! },
            { "dept", request.Dept! },
            { "position", request.Position! },
            { "address", request.Address! },
            { "tel", request.Tel! },
            { "email", request.Email! },
            { "id_card", request.IdCard! },
            { "status", request.Status! },
            { "image", request.Image! },
            { "source", request.Source! },
            { "role_list", request.RoleList! },
            { "permission_function_list", request.PermissionFunctionList! },
            { "session_user_id", _authService.UserId()! }
        };

        _logger.LogProcedureCall(callerName, "um_user_u", parameters);

        var result = await _dataAccessConfiguration.CallProcedureAsync(
            _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
            "um_user_u",
            parameters);

        if (!result.Success)
        {
            throw result.Message.ToProcedureException(result.GetOutputParameter<string>("error_detail"));
        }
    }

    public async Task DeleteUserAsync(int userId)
    {
        var parameters = new Dictionary<string, object>
        {
            { "user_id", userId },
            { "session_user_id", _authService.UserId()! }
        };

        _logger.LogProcedureCall(callerName, "um_user_d", parameters);

        var result = await _dataAccessConfiguration.CallProcedureAsync(
            _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
            "um_user_d",
            parameters);

        if (!result.Success)
        {
            throw result.Message.ToProcedureException(result.GetOutputParameter<string>("error_detail"));
        }
    }
}
