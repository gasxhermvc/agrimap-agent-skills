namespace AgriMap.Web.Service.Infrastructure.Persistence.Interfaces;

public interface IUserRepository
{
    Task<(List<UserSearchModel> Data, PaginationMetaModel? Meta)> SearchUserAsync(UserSearchRequestDto request);
    Task<List<UserSearchAllModel>> SearchAllUsersAsync();
    Task<List<UserOrganizationModel>> GetUserOrganizationAsync(UserOrganizationRequestDto request);
    Task<UserDetailModel?> GetUserByIdAsync(int userId);
    Task InsertUserAsync(UserCreateRequestDto request);
    Task UpdateUserAsync(UserUpdateRequestDto request);
    Task DeleteUserAsync(int userId);
}
