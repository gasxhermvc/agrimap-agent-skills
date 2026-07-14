import {  Component, 
          ElementRef, 
          inject, 
          // ViewChild, 
          viewChild } from '@angular/core'
import { ExampleFlowFacade } from '@domain/example-flow/example-flow.facade'

@Component({
  selector: 'agrimap-example-flow',
  imports: [JsonPipe],
  providers: [ExampleFlowProvider],
  templateUrl: './example-flow.component.html',
  styleUrl: './example-flow.component.scss',
})
export class ExampleFlowComponent {
  // ---------- @NgComponent ----------
  // @ViewChild('listRef') listRef?: ElementRef<HTMLDivElement>

  // ---------- private var ----------
  private readonly listRef = viewChild<ElementRef<HTMLPreElement>>('listRef')
  private readonly facade = inject(ExampleFlowFacade)

  // ---------- public var ----------
  firstName = input<string>(''); 
  changeName = output<string>();
  items = this.facade.items
  loading = this.facade.loading
  stylesUi = false
  required?:boolean

  // ---------- constructor ----------
  constructor() {}

  // ---------- ng lifecycle ----------
  ngOnInit(): void {
    this.facade.load()
  }

  // ---------- public functions ----------
  onToggleRevealed(): void {
    this.revealed = !this.revealed
  }

  // ---------- private functions ----------
  private formatLabel(id: number): string {
    return `#${id}`
  }
}
