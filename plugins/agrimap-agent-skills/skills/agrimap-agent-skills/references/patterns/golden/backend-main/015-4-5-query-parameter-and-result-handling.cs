// Example call stored procedure with parameters and handle result
var result = await _dataAccessConfig.CallProcedureAsync(
    _dbDataAccessService.DatabaseConfigure.DefaultDataSource,
    "dd_dashboard_draft_u",
    parameters);

// Check if stored procedure execution is successful, if not throw exception with error detail from output parameter
if (!result.Success)
{
    throw result.Message.ToProcedureException(result.GetOutputParameter<string>("error_detail"));
}
