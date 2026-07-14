itemSelected = output<Item>() 
filterChange = output<string>()

onSelectItem(item: Item): void {
  this.itemSelected.emit(item)
}
