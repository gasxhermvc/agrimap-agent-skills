class ExampleClass {
  // variable
  private readonly appService = inject(appService) // กำหนด type ด้วย value
  private temperatureC = -10 // same top

  readonly id = 50 
  date?: string // หากไม่มี value ต้องกำหนด type

  constructor() {}

  // functions กำหนด type input และ return เสมอ
  showSummary(): void {
     console.log(`${this.date}: ${this.temperatureC}°C`)
  }

  private getTempF(data: number[]): number {
    return this.temperatureC * (9 / 5) + 32
  }
}
