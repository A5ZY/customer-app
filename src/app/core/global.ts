import { OrderStatus, Delivery } from './enums'
export class Globals {
    public static current: any = {};
    public static enums = {
        OrderStatus,
        Delivery
    }
}