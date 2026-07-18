# C# coding baseline

Apply to every C# file in `be-main` and `be-library`. Curated golden and owner rules outrank incidental legacy formatting; preserve proven public compatibility.

## Contents

- [Namespaces, files, and naming](#namespaces-files-and-naming)
- [HTTP boundary and DTOs](#http-boundary-and-dtos)
- [Request values](#request-values)
- [Async, errors, data, and logs](#async-errors-data-and-logs)
- [Comments and tests](#comments-and-tests)

## Namespaces, files, and naming

- Use these roots: `agmws` = `AgriMap.Web.Service`; `agmbo` = `AgriMap.Worker`.
- Append only a fixed namespace below. Subfolders may organize files but never extend the namespace.

| Tier | Fixed namespace below `{Root}` |
| --- | --- |
| Application | `Application`, `Application.Interfaces`, `Application.UseCases` |
| Domain | `Domain.Constants`, `Domain.Entities`, `Domain.ValueObjects` |
| Infrastructure | `Infrastructure`, `Infrastructure.ExternalService`, `Infrastructure.Persistence.Interfaces`, `Infrastructure.Persistence.Models`, `Infrastructure.Persistence.Repositories` |
| Presentation | `Presentation.Config`, `Presentation.Controllers`, `Presentation.DTOs.Requests`, `Presentation.DTOs.Responses`, `Presentation.Filters`, `Presentation.Middlewares`, `Presentation.Mockup`, `Presentation.Models` |
| Shared | `Shared.Extensions`, `Shared.Helpers` |
| `agmbo` scheduling | `Infrastructure.Jobs` (`Infrastructure/Jobs/JobScheduler.cs`) |

This table is a namespace allowlist, not permission to create every tier. `agmbo` keeps its scheduler entry and does not gain a Presentation tier unless the project already proves one is required.

```csharp
// Correct even when the file is under DTOs/Requests/OAuth/
namespace AgriMap.Web.Service.Presentation.DTOs.Requests;

// Forbidden: a subfolder must not extend a fixed namespace
namespace AgriMap.Web.Service.Presentation.DTOs.Requests.OAuth;
```

- Use `Application` and `Infrastructure` root namespaces for their DI registration extensions.
- Use `Presentation.Mockup` for JSON assets and `Presentation.Models` for models/model binders; do not invent deeper namespaces.
- Use one public type per file and a file-scoped namespace. Reuse global usings; add only imports required to compile, before the namespace. Never use an alias to bypass the fixed namespace rule.
- Use PascalCase for types/members, `I` for interfaces, `_camelCase` for private readonly dependencies, and `Async` for new async I/O methods. Preserve existing public names when renaming would break compatibility.
- Name transport types `*RequestDto` / `*ResponseDto`, orchestration `*UseCase`, inward data ports `I*Repository`, and implementations `*Repository`.
- Keep Presentation, Application, Domain, Port, and Infrastructure responsibilities separate as defined in [backend.md](backend.md).

`Infrastructure.Persistence.Models` is reserved for MongoDB documents or ORM entities. AtlasX Core Query results normally map to `Domain.Entities`/`Domain.ValueObjects` for business data or `Presentation.DTOs.Responses` for the outward contract; do not create a persistence model only to mirror an AtlasX result.

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
