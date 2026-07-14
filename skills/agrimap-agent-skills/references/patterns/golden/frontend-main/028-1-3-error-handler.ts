loadUsersInfo(): void {
  const usersInfo = this.appService.getLut('usersInfo')
  this.appService.showLoading() // แสดง loading
  this.konectApi
    .getAppAuthenUserinfo()
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.appService.hideLoading() // ซ่อน loading
      }),
    )
    .subscribe({
      next: (res: UserInfo) => {
        this.store.setUsersInfo(res)
      },
      error: (error: HttpErrorResponse) => {
        this.appService.showToast(error.error.message, 'error') // error show
      },
    })
}
