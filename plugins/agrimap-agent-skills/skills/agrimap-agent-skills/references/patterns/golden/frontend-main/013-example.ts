import { ExampleFlowCild } from '@features/example-flow/example-flow-child/example-flow-child.component'

@Component({
  selector: 'agrimap-example-flow',
  imports: [ExampleFlowCild],  // นำ feature child เข้ามา
  templateUrl: './example-flow.component.html',
  styleUrl: './example-flow.component.scss',
})
export class ExampleChildComponent { ... }
