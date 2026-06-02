import categoriesData from './categories.json';
import productsData from './products.json';

const INVENTORY_ID = parseInt(process.env.BASELINKER_INVENTORY_ID ?? '35743', 10);

export function getMockResponse(method: string, params: Record<string, unknown>): unknown {
  switch (method) {
    case 'getInventories':
      return {
        status: 'SUCCESS',
        inventories: [
          {
            inventory_id: INVENTORY_ID,
            name: 'Kobold Defense',
            description: 'Kobold',
            languages: ['pl'],
            default_language: 'pl',
            price_groups: [23934],
            default_price_group: 23934,
            warehouses: ['blconnect_6820'],
            default_warehouse: 'blconnect_6820',
            reservations: false,
            is_default: false,
          },
        ],
      };

    case 'getInventoryCategories':
      return {
        status: 'SUCCESS',
        categories: categoriesData,
      };

    case 'getInventoryProductsList': {
      const page = (params.page as number) ?? 1;
      // All products on page 1, empty on subsequent pages (mock has no pagination)
      if (page > 1) {
        return { status: 'SUCCESS', products: {} };
      }
      return { status: 'SUCCESS', products: productsData.products_list };
    }

    case 'getInventoryProductsData': {
      const ids = (params.products as string[]) ?? [];
      const result: Record<string, unknown> = {};
      for (const id of ids) {
        const product = (productsData.products_data as Record<string, unknown>)[id];
        if (product) result[id] = product;
      }
      return { status: 'SUCCESS', products: result };
    }

    case 'addOrder':
      return { status: 'SUCCESS', order_id: Math.floor(Math.random() * 900000) + 100000 };

    default:
      return { status: 'ERROR', error_code: 'METHOD_NOT_FOUND', error_message: `Mock: unknown method ${method}` };
  }
}
