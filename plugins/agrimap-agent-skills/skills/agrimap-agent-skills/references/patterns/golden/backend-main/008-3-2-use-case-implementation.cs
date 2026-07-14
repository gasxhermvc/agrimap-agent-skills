namespace AgriMap.Web.Service.Application.UseCases;

public class UserUseCase : IUserUseCase
{
    private readonly IUserRepository _userRepository;

    public UserUseCase(IUserRepository userRepository)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
    }

    public async Task<PaginatedResultResponseDto<UserResponseDto>> SearchUser(UserSearchRequestDto request)
    {
        var (data, meta) = await _userRepository.SearchUserAsync(request);

        var rows = request.Rows <= 0 ? 10 : request.Rows;
        var page = request.Page <= 0 ? 1 : request.Page;

        return new PaginatedResultResponseDto<UserResponseDto>
        {
            Meta = new PaginationMetaResponseDto
            {
                Rows = meta?.Rows ?? rows,
                Page = meta?.Page ?? page,
                TotalRecords = meta?.TotalRecords ?? data.Count,
                TotalPages = meta?.TotalPages ?? (int)Math.Ceiling(data.Count / (double)rows)
            },
            Data = data.Select(u => new UserResponseDto
            {
                UserId = u.UserId,
                Username = u.Username,
                Title = u.Title,
                Name = u.Name,
                Surname = u.Surname,
                Dept = u.Dept,
                Position = u.Position,
                Tel = u.Tel,
                Email = u.Email,
                IdCard = u.IdCard,
                Status = u.Status,
                StatusName = u.StatusName,
                Image = u.Image,
                DateCreated = u.DateCreated,
                UserCreated = u.UserCreated,
                RoleList = u.RoleList
            }).ToList()
        };
    }

    public async Task<DataMessageResponseDto<UserDetailResponseDto>> GetUserById(int userId)
    {
        var user = await _userRepository.GetUserByIdAsync(userId);

        if (user is null)
        {
            throw new AppException(404, "user_not_found", $"User with ID {userId} not found.");
        }

        return new DataMessageResponseDto<UserDetailResponseDto>
        {
            Data = new UserDetailResponseDto
            {
                UserId = user.UserId,
                Username = user.Username,
                Title = user.Title,
                Name = user.Name,
                Surname = user.Surname,
                Dept = user.Dept,
                Position = user.Position,
                Address = user.Address,
                Tel = user.Tel,
                Email = user.Email,
                IdCard = user.IdCard,
                Status = user.Status,
                Image = user.Image,
                PasswordModified = user.PasswordModified,
                ForceChangePassword = user.ForceChangePassword,
                Source = user.Source,
                RoleList = !string.IsNullOrEmpty(user.RoleList)
                    ? JsonSerializer.Deserialize<List<UserRoleItemResponseDto>>(user.RoleList) ?? new()
                    : new(),
                DateCreated = user.DateCreated,
                UserCreated = user.UserCreated,
                DateModified = user.DateModified,
                UserModified = user.UserModified
            },
            Message = string.Empty
        };
    }

    public async Task<DataMessageResponseDto<object>> InsertUser(UserCreateRequestDto request)
    {
        await _userRepository.InsertUserAsync(request);

        return new DataMessageResponseDto<object>
        {
            Data = new
            {
                Success = true
            },
            Message = string.Empty
        };
    }

    public async Task<DataMessageResponseDto<object>> UpdateUser(UserUpdateRequestDto request)
    {
        await _userRepository.UpdateUserAsync(request);

        return new DataMessageResponseDto<object>
        {
            Data = new
            {
                UserId = request.UserId,
                Success = true
            },
            Message = string.Empty
        };
    }

    public async Task<DataMessageResponseDto<object>> DeleteUser(int userId)
    {
        await _userRepository.DeleteUserAsync(userId);

        return new DataMessageResponseDto<object>
        {
            Data = new
            {
                UserId = userId,
                Success = true
            },
            Message = string.Empty
        };
    }
}
