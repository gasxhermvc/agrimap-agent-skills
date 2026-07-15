loadUsersInfo(): void {
  const loadKey = 'loadUsersInfo_' + Date.now()
  this.appService.showLoading(loadKey)
  this.konectApi
    .getAppAuthenUserinfo()
    .pipe(
      tap((res: UserInfo) => this.store.setUsersInfo(res)),
      catchError((err: HttpErrorResponse) => {
        this.appService.showToast(err?.error?.message ?? 'เกิดข้อผิดพลาด', 'error')
        return EMPTY                                    // กลืน error — stream จบเงียบ
      }),
      finalize(() => this.appService.hideLoading(loadKey)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe()
}