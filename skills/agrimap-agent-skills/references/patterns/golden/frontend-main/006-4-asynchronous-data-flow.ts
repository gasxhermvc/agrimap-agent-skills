@Injectable()
export class ExampleStore {
  // ---------- STATE ----------
  private state = signal<{
    list: ExampleItem[]
    loading: boolean
    error: string | null
  }>({
    list: [],
    loading: false,
    error: null,
  })

  // ---------- SELECTORS ----------
  readonly items = computed(() => this.state().items);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  // ---------- MUTATORS ----------
  startLoad(): void {
    this.state.update((s) => ({ ...s, loading: true, error: null }))
  }
  setSuccess(items: ExampleItem[]): void {
    this.state.update((s) => ({ ...s, list: items, loading: false, error: null }))
  }
  setError(message: string | null): void {
    this.state.update((s) => ({ ...s, error: message, loading: false }))
  }
}
