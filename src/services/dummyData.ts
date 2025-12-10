// Structured perfume data with brands

export interface PerfumeBrand {
  brand: string;
  name: string;
}

export const perfumes: PerfumeBrand[] = [
  { brand: 'Dior', name: 'Sauvage' },
  { brand: 'Dior', name: 'Homme' },
  { brand: 'Dior', name: 'Fahrenheit' },
  { brand: 'Chanel', name: 'Bleu de Chanel' },
  { brand: 'Chanel', name: 'Allure Homme Sport' },
  { brand: 'Chanel', name: 'Platinum Égoïste' },
  { brand: 'YSL', name: 'La Nuit de L\'Homme' },
  { brand: 'YSL', name: 'Y' },
  { brand: 'YSL', name: 'L\'Homme' },
  { brand: 'Creed', name: 'Aventus' },
  { brand: 'Creed', name: 'Silver Mountain Water' },
  { brand: 'Creed', name: 'Green Irish Tweed' },
  { brand: 'Tom Ford', name: 'Oud Wood' },
  { brand: 'Tom Ford', name: 'Tobacco Vanille' },
  { brand: 'Tom Ford', name: 'Noir Extreme' },
  { brand: 'Versace', name: 'Eros' },
  { brand: 'Versace', name: 'Dylan Blue' },
  { brand: 'Versace', name: 'The Dreamer' },
  { brand: 'Paco Rabanne', name: '1 Million' },
  { brand: 'Paco Rabanne', name: 'Invictus' },
  { brand: 'Jean Paul Gaultier', name: 'Le Male' },
  { brand: 'Jean Paul Gaultier', name: 'Ultra Male' },
  { brand: 'Givenchy', name: 'Gentleman' },
  { brand: 'Givenchy', name: 'L\'Homme' },
  { brand: 'Armani', name: 'Code' },
  { brand: 'Armani', name: 'Acqua di Gio' },
  { brand: 'Armani', name: 'Stronger With You' },
  { brand: 'Dolce & Gabbana', name: 'Light Blue' },
  { brand: 'Dolce & Gabbana', name: 'The One' },
  { brand: 'Hugo Boss', name: 'Bottled' },
  { brand: 'Hugo Boss', name: 'The Scent' },
  { brand: 'Prada', name: 'L\'Homme' },
  { brand: 'Prada', name: 'Luna Rossa' },
  { brand: 'Burberry', name: 'London' },
  { brand: 'Burberry', name: 'Brit' },
  { brand: 'Carolina Herrera', name: '212 Men' },
  { brand: 'Carolina Herrera', name: 'Bad Boy' },
  { brand: 'Gucci', name: 'Guilty' },
  { brand: 'Gucci', name: 'Bloom' },
  { brand: 'Calvin Klein', name: 'Eternity' },
  { brand: 'Calvin Klein', name: 'Obsession' },
  { brand: 'Ralph Lauren', name: 'Polo Red' },
  { brand: 'Ralph Lauren', name: 'Polo Blue' },
  { brand: 'Davidoff', name: 'Cool Water' },
  { brand: 'Davidoff', name: 'The Game' },
];

export const sizes = ['30ml', '50ml', '75ml', '100ml', '150ml'];

export interface Product {
  id: string;
  brand: string;
  name: string;
  size: string;
  fullName: string;
  quantity: number;
  unitCost: number;
  sold: number;
  remaining: number;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  status: 'preparing' | 'shipped' | 'delivered' | 'settled';
  createdDate: string;
  products: Product[];
  totalCost: number;
  totalRevenue: number;
  totalProducts: number;
  totalUnits: number;
  remainingUnits: number;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function generateDummyShipments(): Shipment[] {
  const shipments: Shipment[] = [];
  const shipmentConfigs = [
    { perfumeCount: 14, status: 'delivered' as const },
    { perfumeCount: 40, status: 'shipped' as const },
    { perfumeCount: 25, status: 'preparing' as const },
  ];

  shipmentConfigs.forEach((config, shipmentIndex) => {
    const shipmentNumber = `Shipment ${shipmentIndex + 1}`;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - (shipmentIndex * 7));

    const products: Product[] = [];
    const shuffledPerfumes = shuffleArray(perfumes);
    
    for (let i = 0; i < config.perfumeCount; i++) {
      const perfume = shuffledPerfumes[i % shuffledPerfumes.length];
      const size = randomFromArray(sizes);
      const quantity = randomInt(5, 30);
      const unitCost = randomInt(30, 150);
      
      let sold = 0;
      if (config.status === 'delivered') {
        sold = randomInt(0, quantity);
      } else if (config.status === 'shipped') {
        sold = randomInt(0, Math.floor(quantity / 2));
      }

      products.push({
        id: `product-${shipmentIndex}-${i}`,
        brand: perfume.brand,
        name: perfume.name,
        size,
        fullName: `${perfume.brand} ${perfume.name} ${size}`,
        quantity,
        unitCost,
        sold,
        remaining: quantity - sold,
      });
    }

    products.sort((a, b) => {
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.size.localeCompare(b.size);
    });

    const totalCost = products.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0);
    const totalRevenue = products.reduce((sum, p) => sum + (p.sold * p.unitCost * 1.5), 0);

    shipments.push({
      id: `shipment-${shipmentIndex}`,
      shipmentNumber,
      status: config.status,
      createdDate: createdDate.toISOString(),
      products,
      totalCost,
      totalRevenue,
      totalProducts: products.length,
      totalUnits: products.reduce((sum, p) => sum + p.quantity, 0),
      remainingUnits: products.reduce((sum, p) => sum + p.remaining, 0),
    });
  });

  return shipments;
}
