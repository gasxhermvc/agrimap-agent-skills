import { DestroyRef, inject, Injectable } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

@Injectable()
export class ExampleFlowFacade {
  private readonly store = inject(ExampleFlowStore)
  private readonly konectApi = inject(KonectApi)
  private readonly destroyRef = inject(DestroyRef)

  items = this.store.items
  loading = this.store.loading
  error = this.store.error

  load(): void {
    this.store.startLoad()
    this.konectApi.getAppAuthenUserinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.store.setSuccess(res),
        error: (err) => this.store.setError(err.error?.message ?? null),
      })
  }
}
