import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Item } from "src/app/interfaces/item.interface";
import { Category } from "src/app/interfaces/category.interface";
import { ItemsService } from "src/app/services/items/items.service";
import { OrdersService } from "../../services/orders/orders.service";
import { Order } from "src/app/classes/order.class";
import { TablesService } from "src/app/services/tables/tables.service";
import { Table } from "src/app/interfaces/table.interface";
import { OrderDetail } from "src/app/interfaces/orderDetail.interface";
import { ToasterService } from "src/app/services/toaster/toaster.service";
import { AuthService } from "src/app/services/auth/auth.service";
import { AppComponent } from "src/app/app.component";

@Component({
	selector: "app-menu",
	templateUrl: "./menu.component.html",
	styleUrls: ["./menu.component.css"],
})
export class MenuComponent implements OnInit, OnDestroy {
	items: Item[] = [];
	categories: Category[] = [];
	filteredItems: Item[] = [];
	searchQuery = "";
	order!: Order;
	tables: Table[] = [];
	selectedTable!: number;
	updatedName!: string;
	updatedPrice!: number;
	editMode = false;
	editedItem: Item | null = null;
	role!: string | null;
	admin = false;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private itemsService: ItemsService,
		private ordersService: OrdersService,
		private tableService: TablesService,
		private toaster: ToasterService,
		private auth: AuthService,
		private appComp: AppComponent
	) { }

	toggleEditMode(item: Item) {
		if (this.editMode) {
			item.name = this.updatedName;
			item.price = this.updatedPrice;
			this.itemsService.updateItem(item).subscribe((updatedItem) => {
				item = updatedItem;
			});
		} else {
			this.updatedName = item.name;
			this.updatedPrice = item.price;
			this.editedItem = item;
		}
		this.editMode = !this.editMode;
	}

	ngOnInit(): void {
		this.role = this.auth.getUserRole();
		this.admin = this.appComp.isUserOrAdmin();

		// Initialize or retrieve the order
		this.order = this.ordersService.currentOrder || new Order();
		this.selectedTable = this.order.tableID || 0;

		this.route.paramMap.subscribe((params) => {
			const categoryID = params?.get("categoryID");
			if (categoryID) {
				this.itemsService
					.getItemsByCategoryId(+categoryID)
					.subscribe((items) => {
						this.filteredItems = items;
					});
			} else {
				this.getAllItems();
			}
		});

		this.itemsService.getAllCategories().subscribe((categories) => {
			this.categories = categories;
		});

		this.tableService.getAll().subscribe((tables: Table[]) => {
			this.tables = tables.filter((t) => t.status === false);
		});
	}

	getAllItems() {
		this.itemsService.getAllItems().subscribe(items => {
			this.items = items;
			this.filteredItems = items; // Set filteredItems to all items
		});
	}

	addToOrder(item: Item) {
		this.order.addItem(item);
		this.toaster.showToaster('success', item.name + ' added successfully', 'success');
	}

	filterItems() {
		if (this.searchQuery.trim() !== "") {
			this.filteredItems = this.items.filter((item) => {
				return item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
			});
		} else {
			this.filteredItems = this.items;
		}
	}

	addSelectedItemsToOrder(tableID: number) {
		const tableIDs: number[] = [];
		if (tableID) {
			tableIDs.push(tableID);
		}
		if (this.order.tableID) {
			tableIDs.push(this.order.tableID!);
		}
		this.order.tableID = tableID!;
		this.tableService.updateTable(tableIDs).subscribe(table => {
			console.log("updated table" + this.order.tableID);
		});
		this.ordersService.add(this.order);

		// Clear the order after submission
		this.clearOrder();

		this.router.navigate(["/orders"]);
	}

	clearOrder() {
		this.order = new Order(); // Reset the order to a new instance
		this.ordersService.currentOrder = null; // Clear the currentOrder in the OrdersService
	}

	removeItem(item: Item) {
		this.order.removeItem(item);
	}

	get buttonText() {
		return this.order.id ? 'UPDATE' : 'ORDER';
	}

	increment(orderDetail: OrderDetail) {
		orderDetail.quantity++;
		this.order.total += orderDetail.item.price;
	}

	decrement(orderDetail: OrderDetail) {
		orderDetail.quantity--;
		this.order.total -= orderDetail.item.price;
	}

	ngOnDestroy(): void {
		this.ordersService.currentOrder = this.order; // Preserve the current order
	}
}
