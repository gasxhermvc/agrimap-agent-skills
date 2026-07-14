import { Observable, BehaviorSubject, Subject } from 'rxjs'
import { map } from 'rxjs/operators'

// กำหนด type ที่ stream emit (Observable<T>, BehaviorSubject<T>, Subject<T>)
readonly list$ = new Observable<ExampleItem[]>(/* ... */)
readonly loading$ = new BehaviorSubject<boolean>(false)
readonly selectedId$ = new Subject<number>()

// ใช้กับ pipe / operator ได้ type ตามที่กำหนด
readonly count$ = this.list$.pipe(
  map((items: ExampleItem[]) => items.length)
)
