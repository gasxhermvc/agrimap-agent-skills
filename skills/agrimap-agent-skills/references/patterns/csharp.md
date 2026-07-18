# C# coding baseline

Apply to every C# file in `be-main` and `be-library`. Curated golden and owner rules outrank incidental legacy formatting; preserve proven public compatibility.

## Contents

- [Shape and naming](#shape-and-naming)
- [HTTP boundary and DTOs](#http-boundary-and-dtos)
- [Request values](#request-values)
- [Async, errors, data, and logs](#async-errors-data-and-logs)
- [Comments and tests](#comments-and-tests)

## Shape and naming

- Use one public type per file and the project's file-scoped namespace.
- Use PascalCase for types/members, `I` for interfaces, `_camelCase` for private readonly dependencies, and `Async` for new async I/O methods. Preserve existing public names when renaming would break compatibility.
- Name transport types `*RequestDto` / `*ResponseDto`, orchestration `*UseCase`, inward data ports `I*Repository`, and implementations `*Repository`.
- Keep Presentation, Application, Domain, Port, and Infrastructure responsibilities separate as defined in [backend.md](backend.md).

```csharp
namespace AgriMap.Web.Service.Application.UseCases;

public class UserUseCase : IUserUseCase
{
    private readonly IUserRepository _userRepository;

    public UserUseCase(IUserRepository userRepository)
    {
        _userRepository = userRepository
            ?? throw new ArgumentNullException(nameof(userRepository));
    }
}
```

## HTTP boundary and DTOs

Keep controllers thin: bind/validate the contract, call one use-case operation, and return the established response wrapper. Put orchestration and business decisions in Application/Domain.

```csharp
[ApiController]
[Route("api/user-manage")]
public class UserManageController : ControllerBase
{
    private readonly IUserUseCase _userUseCase;

    public UserManageController(IUserUseCase userUseCase)
    {
        _userUseCase = userUseCase
            ?? throw new ArgumentNullException(nameof(userUseCase));
    }

    [HttpGet("users/search")]
    public Task<PaginatedResultResponseDto<UserResponseDto>> SearchUserAsync(
        [FromQuery] UserSearchRequestDto request,
        CancellationToken cancellationToken)
    {
        return _userUseCase.SearchUserAsync(request, cancellationToken);
    }
}
```

Declare JSON names explicitly when the HTTP contract is snake_case. Use nullable properties only when absence is valid; validate required fields at the boundary.

```csharp
public class UserCreateRequestDto
{
    [Required]
    [StringLength(20)]
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("client_id")]
    public string? ClientId { get; set; }
}
```

## Request values

Use `AgriMap.Platform.Extensions`, centralized constants, normalized nullable strings, and first non-blank resolution:

```text
Cookie (highest) -> Header -> QueryString (lowest) -> Form/body when supported
```

For device ID use `AgmTraceId` cookie -> `agm-device-id` header -> `device_id` query/form. Use `AgmLoginContextId` for the login-context cookie.

```csharp
var deviceId = HttpRequestValueExtensions.FirstNotBlank(
    Request.ReadCookie(
        ClientRequestResolverExtensions.Cookies.AgmTraceId),
    Request.ReadHeader(
        ClientRequestResolverExtensions.Headers.AgmDeviceId),
    Request.ReadQuery(
        ClientRequestResolverExtensions.Parameters.DeviceId));

if (deviceId is null)
{
    deviceId = await Request.ReadFormAsync(
        ClientRequestResolverExtensions.Parameters.DeviceId,
        cancellationToken);
}
```

Do not hardcode request keys, duplicate trim/blank logic, eagerly read a body, or add DI wrappers around static extensions. Load the [request-value golden](golden/backend-libraries/013-1-extensions-request-value-normalize.md) for the complete API.

## Async, errors, data, and logs

- Propagate `CancellationToken` through new async I/O paths; do not block on tasks.
- Throw the established `AppException`/procedure exception with the exact contract code; keep internal detail out of user-facing messages.
- Build stored-procedure parameters in Infrastructure, log the procedure call structurally, check `result.Success`, then map data explicitly.
- Never log secrets, tokens, cookies, authorization values, or personal data merely because they appear in a parameter dictionary.

```csharp
var result = await _dataAccessConfiguration.CallProcedureAsync(
    _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
    "um_user_q",
    parameters);

if (!result.Success)
{
    throw result.Message.ToProcedureException(
        result.GetOutputParameter<string>("error_detail"));
}

return result.DataTable
    .ToList<UserResponseDto>()
    .FirstOrDefault();
```

## Comments and tests

Comment only non-obvious intent, compatibility constraints, gates, or step boundaries. Use XML documentation for public library contracts when the surrounding library does. Avoid comments that restate the statement.

Tests for a resolver must cover each source, blank fallback, conflicting-source priority, multi-value behavior, and body-not-read-until-needed. Follow the repository's existing test framework and naming.
