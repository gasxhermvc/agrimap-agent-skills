@Injectable()
export class ExampleFlowFacade {
  private readonly store = inject(ExampleStore)
  private readonly provider = inject(ExampleProvider)
  private readonly destroyRef = inject(DestroyRef);

  list = this.store.list
  loading = this.store.loading
  error = this.store.error

  load(): void {
    this.store.startLoad()
    this.konectApi.getAppAuthenUserinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: UserInfo) => {
          this.store.setSuccess(res)
        },
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.error.message)
        },
      })
  }
}
