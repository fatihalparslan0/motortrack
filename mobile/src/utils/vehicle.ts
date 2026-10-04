import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Araç (Otomobil & Motosiklet) ve plaka bilgileri yardımcı fonksiyonları,
 * Türkiye araç veri tabanı ve özel eklenen araçları kalıcı kaydetme altyapısı.
 */

export type VehicleCategoryType = 'CAR' | 'MOTO' | 'BOTH';

export interface VehicleBrandData {
  id: string;
  name: string;
  vehicleType: VehicleCategoryType;
  category?: string;
  models: string[];
  isCustom?: boolean;
}

export const STORAGE_CUSTOM_VEHICLES_KEY = '@motortrack_custom_vehicles_v2';

export const POPULAR_BRANDS: VehicleBrandData[] = [
  // ─── OTOMOBİL & TİCARİ ARAÇLAR ───
  {
    id: 'Fiat',
    name: 'Fiat',
    vehicleType: 'CAR',
    category: 'Otomobil / Hafif Ticari',
    models: [
      'Egea', 'Egea Cross', 'Egea Sedan', 'Egea Hatchback', 'Doblo', 'Doblo Combi',
      'Fiorino', 'Fiorino Combi', 'Linea', 'Punto', 'Grande Punto', '500', '500L',
      '500X', 'Panda', 'Albea', 'Bravo', 'Stilo', 'Uno', 'Palio', 'Tipo', 'Ducato', 'Scudo'
    ]
  },
  {
    id: 'Renault',
    name: 'Renault',
    vehicleType: 'CAR',
    category: 'Otomobil / Hafif Ticari',
    models: [
      'Clio', 'Clio 4', 'Clio 5', 'Megane', 'Megane Sedan', 'Megane 4', 'Fluence',
      'Symbol', 'Duster', 'Austral', 'Captur', 'Kadjar', 'Talisman', 'Koleos',
      'Scenic', 'Kangoo', 'Trafic', 'Master', 'Twingo', 'Laguna', 'R19', 'R9 Broadway'
    ]
  },
  {
    id: 'Volkswagen',
    name: 'Volkswagen',
    vehicleType: 'CAR',
    category: 'Alman Otomobil',
    models: [
      'Passat', 'Passat Variant', 'Golf', 'Golf 7', 'Golf 8', 'Polo', 'Caddy',
      'Transporter', 'Caravelle', 'Tiguan', 'T-Roc', 'Taigo', 'Touareg', 'Jetta',
      'Arteon', 'Scirocco', 'Amarok', 'Crafter', 'Beetle', 'CC', 'Bora', 'Touran'
    ]
  },
  {
    id: 'Ford',
    name: 'Ford',
    vehicleType: 'CAR',
    category: 'Otomobil / Ticari',
    models: [
      'Focus', 'Fiesta', 'Tourneo Courier', 'Transit Courier', 'Tourneo Custom',
      'Transit Custom', 'Transit', 'Kuga', 'Mondeo', 'Puma', 'EcoSport', 'Ranger',
      'C-Max', 'B-Max', 'S-Max', 'Connect', 'Escort', 'Taunus'
    ]
  },
  {
    id: 'Toyota',
    name: 'Toyota',
    vehicleType: 'CAR',
    category: 'Japon Otomobil',
    models: [
      'Corolla', 'Corolla Hybrid', 'Corolla Cross', 'Yaris', 'Yaris Cross', 'C-HR',
      'Auris', 'RAV4', 'Hilux', 'Proace City', 'Avensis', 'Camry', 'Land Cruiser',
      'Prius', 'Verso', 'Yaris GR'
    ]
  },
  {
    id: 'Hyundai',
    name: 'Hyundai',
    vehicleType: 'CAR',
    category: 'Kore Otomobil',
    models: [
      'i20', 'Accent Era', 'Accent Blue', 'i10', 'Elantra', 'Tucson', 'Bayon',
      'Kona', 'Santa Fe', 'H-100', 'Staria', 'Getz', 'i30', 'Matrix', 'Sonata', 'Ioniq 5'
    ]
  },
  {
    id: 'Peugeot',
    name: 'Peugeot',
    vehicleType: 'BOTH',
    category: 'Fransız Otomobil & Scooter',
    models: [
      '208', '308', '408', '508', '2008', '3008', '5008', 'Rifter', 'Partner',
      'Expert', 'Boxer', '301', '206', '207', 'Django 125 (Motor)', 'Tweet 125 (Motor)',
      'Speedfight 4 (Motor)', 'Metropolis 400 (Motor)', 'XP400 (Motor)'
    ]
  },
  {
    id: 'Opel',
    name: 'Opel',
    vehicleType: 'CAR',
    category: 'Alman Otomobil',
    models: [
      'Astra', 'Astra J', 'Astra K', 'Astra L', 'Corsa', 'Corsa D', 'Corsa E', 'Corsa F',
      'Mokka', 'Insignia', 'Crossland', 'Grandland', 'Combo', 'Zafira', 'Meriva', 'Vectra'
    ]
  },
  {
    id: 'Mercedes-Benz',
    name: 'Mercedes-Benz',
    vehicleType: 'CAR',
    category: 'Alman Premium',
    models: [
      'C-Serisi (C180, C200)', 'E-Serisi (E200, E220d)', 'A-Serisi (A180, A200)',
      'B-Serisi', 'S-Serisi', 'CLA 180 / 200', 'GLA 180 / 200', 'GLB', 'GLC', 'GLE',
      'Vito', 'Sprinter', 'Citan', 'G-Serisi'
    ]
  },
  {
    id: 'BMW',
    name: 'BMW',
    vehicleType: 'BOTH',
    category: 'Alman Premium & Motosiklet',
    models: [
      '3 Serisi (320i, 320d)', '5 Serisi (520i, 520d)', '1 Serisi (116i, 118i)',
      '2 Serisi Gran Coupe', '4 Serisi Gran Coupe', '7 Serisi', 'X1', 'X2', 'X3', 'X5',
      'R 1250 GS (Motor)', 'R 1300 GS (Motor)', 'R 1200 GS (Motor)', 'F 750 GS (Motor)',
      'F 850 GS (Motor)', 'F 900 XR (Motor)', 'S 1000 RR (Motor)', 'C 400 GT (Motor)',
      'G 310 R (Motor)', 'R 1250 RT (Motor)'
    ]
  },
  {
    id: 'Audi',
    name: 'Audi',
    vehicleType: 'CAR',
    category: 'Alman Premium',
    models: [
      'A3 Sedan', 'A3 Sportback', 'A4 Sedan', 'A4 Avant', 'A5 Sportback', 'A6 Sedan',
      'A7 Sportback', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'e-tron'
    ]
  },
  {
    id: 'Honda',
    name: 'Honda',
    vehicleType: 'BOTH',
    category: 'Japon Otomobil & Motosiklet',
    models: [
      'Civic', 'Civic Sedan', 'City', 'CR-V', 'HR-V', 'Accord', 'Jazz', 'ZR-V',
      'PCX 125 (Motor)', 'PCX 160 (Motor)', 'Forza 250 (Motor)', 'Forza 750 (Motor)',
      'Dio 110 (Motor)', 'Activa 125 (Motor)', 'NC750X (Motor)', 'CBR650R (Motor)',
      'CB650R (Motor)', 'CB250R (Motor)', 'CRF250 Rally (Motor)', 'CRF300L (Motor)',
      'CRF1100L Africa Twin (Motor)', 'ADV350 (Motor)', 'X-ADV 750 (Motor)', 'Spacy Alpha (Motor)'
    ]
  },
  {
    id: 'Dacia',
    name: 'Dacia',
    vehicleType: 'CAR',
    category: 'Otomobil / SUV',
    models: [
      'Duster', 'Sandero', 'Sandero Stepway', 'Jogger', 'Lodgy', 'Dokker', 'Logan'
    ]
  },
  {
    id: 'Skoda',
    name: 'Skoda',
    vehicleType: 'CAR',
    category: 'Avrupa Otomobil',
    models: [
      'Octavia', 'Superb', 'Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Scala', 'Rapid', 'Yeti'
    ]
  },
  {
    id: 'Citroën',
    name: 'Citroën',
    vehicleType: 'CAR',
    category: 'Fransız Otomobil',
    models: [
      'C3', 'C3 Aircross', 'C4', 'C4 X', 'C-Elysee', 'Berlingo', 'C5 Aircross', 'Jumpy', 'Nemo', 'Ami'
    ]
  },
  {
    id: 'Nissan',
    name: 'Nissan',
    vehicleType: 'CAR',
    category: 'Japon Otomobil',
    models: [
      'Qashqai', 'Micra', 'Juke', 'X-Trail', 'Navara', 'Note', 'Pulsar', 'Almera'
    ]
  },
  {
    id: 'Kia',
    name: 'Kia',
    vehicleType: 'CAR',
    category: 'Kore Otomobil',
    models: [
      'Sportage', 'Rio', 'Ceed', 'Cerato', 'Stonic', 'Picanto', 'Sorento', 'XCeed', 'Bongo'
    ]
  },
  {
    id: 'Seat',
    name: 'Seat',
    vehicleType: 'CAR',
    category: 'İspanyol Otomobil',
    models: [
      'Leon', 'Ibiza', 'Arona', 'Ateca', 'Tarraco', 'Toledo', 'Altea'
    ]
  },
  {
    id: 'Volvo',
    name: 'Volvo',
    vehicleType: 'CAR',
    category: 'İsveç Premium',
    models: [
      'XC90', 'XC60', 'XC40', 'S90', 'S60', 'V40', 'V60', 'C40'
    ]
  },
  {
    id: 'Chery',
    name: 'Chery',
    vehicleType: 'CAR',
    category: 'Asya SUV',
    models: [
      'Omoda 5', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Tiggo 4 Pro'
    ]
  },
  {
    id: 'TOGG',
    name: 'TOGG',
    vehicleType: 'CAR',
    category: 'Yerli Elektrikli Otomobil',
    models: [
      'T10X V1', 'T10X V2', 'T10F'
    ]
  },
  {
    id: 'Cupra',
    name: 'Cupra',
    vehicleType: 'CAR',
    category: 'Sportif Otomobil',
    models: [
      'Formentor', 'Leon', 'Ateca', 'Born', 'Tavascan'
    ]
  },
  {
    id: 'Jeep',
    name: 'Jeep',
    vehicleType: 'CAR',
    category: 'SUV / Arazi',
    models: [
      'Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Avenger'
    ]
  },
  {
    id: 'Land Rover',
    name: 'Land Rover',
    vehicleType: 'CAR',
    category: 'İngiliz SUV',
    models: [
      'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar',
      'Discovery', 'Discovery Sport', 'Defender'
    ]
  },
  {
    id: 'Suzuki',
    name: 'Suzuki',
    vehicleType: 'BOTH',
    category: 'Japon Otomobil & Motosiklet',
    models: [
      'Swift', 'Vitara', 'Jimny', 'S-Cross', 'Baleno', 'SX4',
      'Burgman 400 (Motor)', 'Burgman 200 (Motor)', 'Burgman 125 (Motor)', 'Address 110 (Motor)',
      'Avenis 125 (Motor)', 'V-Strom 650 (Motor)', 'V-Strom 800DE (Motor)', 'GSX-R1000 (Motor)', 'Hayabusa (Motor)'
    ]
  },
  {
    id: 'Mitsubishi',
    name: 'Mitsubishi',
    vehicleType: 'CAR',
    category: 'Japon Otomobil / Pikap',
    models: [
      'L200', 'ASX', 'Eclipse Cross', 'Space Star', 'Outlander', 'Pajero', 'Lancer', 'Colt'
    ]
  },
  {
    id: 'Chevrolet',
    name: 'Chevrolet',
    vehicleType: 'CAR',
    category: 'Amerikan Otomobil',
    models: [
      'Cruze', 'Aveo', 'Captiva', 'Trax', 'Spark', 'Kalos', 'Lacetti', 'Epica'
    ]
  },
  {
    id: 'Tesla',
    name: 'Tesla',
    vehicleType: 'CAR',
    category: 'Elektrikli Otomobil',
    models: [
      'Model Y', 'Model 3', 'Model S', 'Model X'
    ]
  },
  {
    id: 'Mini',
    name: 'Mini',
    vehicleType: 'CAR',
    category: 'İngiliz Otomobil',
    models: [
      'Cooper', 'Cooper S', 'Countryman', 'Clubman', 'John Cooper Works'
    ]
  },
  {
    id: 'Alfa Romeo',
    name: 'Alfa Romeo',
    vehicleType: 'CAR',
    category: 'İtalyan Otomobil',
    models: [
      'Giulietta', 'Tonale', 'Giulia', 'Stelvio', 'Mito', 'Junior'
    ]
  },

  // ─── MOTOSİKLET & SCOOTER BRANDS ───
  {
    id: 'Yamaha',
    name: 'Yamaha',
    vehicleType: 'MOTO',
    category: 'Japon Motosiklet',
    models: [
      'NMAX 125', 'NMAX 155', 'XMAX 250', 'XMAX 300', 'XMAX 400', 'TMAX 560',
      'MT-07', 'MT-09', 'MT-25', 'MT-10', 'YZF-R25', 'YZF-R7', 'YZF-R1', 'YZF-R6',
      'Tracer 7', 'Tracer 9 / GT', 'Tenere 700', 'XSR700', 'XSR900', 'D’elight 125',
      'YS125', 'YBR 125', 'Crypton'
    ]
  },
  {
    id: 'Kawasaki',
    name: 'Kawasaki',
    vehicleType: 'MOTO',
    category: 'Japon Motosiklet',
    models: [
      'Ninja 400', 'Ninja 650', 'Ninja ZX-6R', 'Ninja ZX-10R', 'Ninja H2',
      'Z400', 'Z650', 'Z900', 'Z1000', 'Versys 650', 'Versys 1000', 'Versys-X 300',
      'Vulcan S'
    ]
  },
  {
    id: 'KTM',
    name: 'KTM',
    vehicleType: 'MOTO',
    category: 'Avusturya Motosiklet',
    models: [
      '125 Duke', '250 Duke', '390 Duke', '790 Duke', '890 Duke / R', '1290 Super Duke R',
      '250 Adventure', '390 Adventure', '790 Adventure', '890 Adventure', '1290 Super Adventure',
      'RC 125', 'RC 200', 'RC 390'
    ]
  },
  {
    id: 'Bajaj',
    name: 'Bajaj',
    vehicleType: 'MOTO',
    category: 'Motosiklet',
    models: [
      'Pulsar NS 200', 'Pulsar RS 200', 'Pulsar N250', 'Pulsar F250', 'Pulsar 150',
      'Dominar 400', 'Dominar 250', 'Discover 125', 'Boxer 150', 'Chetak'
    ]
  },
  {
    id: 'CFMOTO',
    name: 'CFMOTO',
    vehicleType: 'MOTO',
    category: 'Motosiklet / ATV',
    models: [
      '250SR', '450SR', '250NK', '400NK', '650NK', '700CL-X', '800MT', '650MT',
      '650GT', '450MT', '300NK', '150NK'
    ]
  },
  {
    id: 'Vespa',
    name: 'Vespa',
    vehicleType: 'MOTO',
    category: 'İtalyan Scooter',
    models: [
      'Primavera 125 / 150', 'Sprint 125 / 150', 'GTS 300 / Super', 'GTS 125',
      'Sei Giorni', 'Elettrica', 'LX 150'
    ]
  },
  {
    id: 'Ducati',
    name: 'Ducati',
    vehicleType: 'MOTO',
    category: 'İtalyan Motosiklet',
    models: [
      'Monster', 'Monster 821', 'Monster 1200', 'Panigale V2', 'Panigale V4',
      'Multistrada V2', 'Multistrada V4', 'Hypermotard 950', 'Scrambler Icon',
      'Diavel V4', 'Streetfighter V4', 'DesertX'
    ]
  },
  {
    id: 'Piaggio',
    name: 'Piaggio',
    vehicleType: 'MOTO',
    category: 'İtalyan Scooter',
    models: [
      'Beverly 300 / 400', 'Medley 150', 'Liberty 125 / 150', 'MP3 300 / 500'
    ]
  },
  {
    id: 'SYM',
    name: 'SYM',
    vehicleType: 'MOTO',
    category: 'Scooter / Motosiklet',
    models: [
      'Jet 14 125 / 200', 'Jet X 125', 'Fiddle III / IV', 'Joymax 250', 'Joyride 300',
      'Cruisym 250 / 300', 'Maxsym 400 / TL 508', 'Orbit II / III', 'Symphony 125'
    ]
  },
  {
    id: 'Kymco',
    name: 'Kymco',
    vehicleType: 'MOTO',
    category: 'Scooter / Maxi Scooter',
    models: [
      'Agility 125 / 16+ 200', 'Downtown 250 / 350', 'X-Town 250', 'AK 550',
      'People S 125 / 200', 'Like 125 / 150', 'DT X360'
    ]
  },
  {
    id: 'Triumph',
    name: 'Triumph',
    vehicleType: 'MOTO',
    category: 'İngiliz Motosiklet',
    models: [
      'Tiger 900', 'Tiger 1200', 'Tiger Sport 660', 'Street Triple 765', 'Speed Triple 1200',
      'Bonneville T100 / T120', 'Scrambler 900 / 1200', 'Trident 660'
    ]
  },
  {
    id: 'Harley-Davidson',
    name: 'Harley-Davidson',
    vehicleType: 'MOTO',
    category: 'Amerikan Cruiser',
    models: [
      'Iron 883', 'Forty-Eight', 'Street Bob', 'Fat Boy', 'Fat Bob',
      'Pan America 1250', 'Road King', 'Street Glide', 'Road Glide', 'Sportster S'
    ]
  },
  {
    id: 'Aprilia',
    name: 'Aprilia',
    vehicleType: 'MOTO',
    category: 'İtalyan Motosiklet & Scooter',
    models: [
      'SR GT 125 / 200', 'RS 660', 'Tuono 660', 'RSV4', 'Tuono V4', 'Tuareg 660', 'SXR 50'
    ]
  },
  {
    id: 'TVS',
    name: 'TVS',
    vehicleType: 'MOTO',
    category: 'Motosiklet / Scooter',
    models: [
      'Jupiter 110 / 125', 'Ntorq 125', 'Apache RTR 200', 'Apache RTR 160', 'Ronin 225', 'iQube'
    ]
  },
  {
    id: 'RKS',
    name: 'RKS',
    vehicleType: 'MOTO',
    category: 'Motosiklet / Scooter',
    models: [
      'Wildcat 125', 'Freccia 150', 'Arome 125', 'Bitter 50 / 125', 'Spontini 110',
      'Titanic 150', 'RT 250', 'Winner 200'
    ]
  },
  {
    id: 'Kuba',
    name: 'Kuba',
    vehicleType: 'MOTO',
    category: 'Motosiklet / Scooter',
    models: [
      'Bluebird 50', 'Brilliant 125', 'Superlight 200', 'TK03', 'Space 50', 'Pike 50', 'Reiz 125'
    ]
  },
  {
    id: 'Mondial',
    name: 'Mondial',
    vehicleType: 'MOTO',
    category: 'Motosiklet / Scooter',
    models: [
      'Drift L 125', 'Turismo 50', 'Wing 50', 'Fury 110', 'Strada 125', 'RX3i Evo', '125 ZNU'
    ]
  },
  {
    id: 'Arora',
    name: 'Arora',
    vehicleType: 'MOTO',
    category: 'Motosiklet / Scooter',
    models: [
      'Cappucino 50 / 125', 'Max T 150', 'Vesta 50', 'Freedom 50', 'Mojito 50', 'Verano 50'
    ]
  },
  {
    id: 'Husqvarna',
    name: 'Husqvarna',
    vehicleType: 'MOTO',
    category: 'Motosiklet',
    models: [
      'Svartpilen 125 / 250 / 401', 'Vitpilen 401', 'Norden 901', '701 Enduro / Supermoto'
    ]
  },
  {
    id: 'Benelli',
    name: 'Benelli',
    vehicleType: 'MOTO',
    category: 'Motosiklet',
    models: [
      'TRK 502 / 502X', 'TRK 702 / 702X', 'Leoncino 250 / 500 / 800', 'TNT 125', 'TNT 25'
    ]
  },
  {
    id: 'Hero',
    name: 'Hero',
    vehicleType: 'MOTO',
    category: 'Motosiklet',
    models: [
      'Dash 110 / 125', 'Pleasure+', 'Xpulse 200 / 4V', 'Hunk 150', 'Ignitor 125'
    ]
  },
  {
    id: 'Voge',
    name: 'Voge',
    vehicleType: 'MOTO',
    category: 'Motosiklet',
    models: [
      '300DS', '500DS / DSX', '525DSX', '300AC', '500AC', 'SR4 Max'
    ]
  }
];

/**
 * AsyncStorage'dan kullanıcının daha önce manuel eklediği marka ve modelleri getirir
 */
export async function getCustomVehicles(): Promise<VehicleBrandData[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_VEHICLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Kullanıcının manuel eklediği yeni markayı kalıcı olarak kaydeder
 */
export async function saveCustomVehicleBrand(
  brandName: string,
  vehicleType: VehicleCategoryType = 'CAR'
): Promise<VehicleBrandData[]> {
  try {
    const trimmed = brandName.trim();
    if (!trimmed) return await getCustomVehicles();

    const currentCustom = await getCustomVehicles();
    const existingIndex = currentCustom.findIndex(
      b => b.name.toLowerCase() === trimmed.toLowerCase()
    );

    let updated: VehicleBrandData[];
    if (existingIndex >= 0) {
      updated = currentCustom;
    } else {
      const newBrand: VehicleBrandData = {
        id: `custom_${Date.now()}_${trimmed}`,
        name: trimmed,
        vehicleType,
        category: 'Özel / Kayıtlı',
        models: [],
        isCustom: true,
      };
      updated = [newBrand, ...currentCustom];
    }

    await AsyncStorage.setItem(STORAGE_CUSTOM_VEHICLES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Kullanıcının manuel eklediği yeni modeli ilgili marka altına kalıcı olarak kaydeder
 */
export async function saveCustomVehicleModel(
  brandName: string,
  modelName: string
): Promise<VehicleBrandData[]> {
  try {
    const cleanBrand = brandName.trim();
    const cleanModel = modelName.trim();
    if (!cleanBrand || !cleanModel) return await getCustomVehicles();

    const currentCustom = await getCustomVehicles();
    const existingIndex = currentCustom.findIndex(
      b => b.name.toLowerCase() === cleanBrand.toLowerCase()
    );

    let updated: VehicleBrandData[];
    if (existingIndex >= 0) {
      const brand = currentCustom[existingIndex];
      const hasModel = brand.models.some(m => m.toLowerCase() === cleanModel.toLowerCase());
      if (!hasModel) {
        const updatedBrand = { ...brand, models: [cleanModel, ...brand.models] };
        updated = [...currentCustom];
        updated[existingIndex] = updatedBrand;
      } else {
        updated = currentCustom;
      }
    } else {
      // Standart listede olan bir markaya yeni model ekleniyorsa
      const builtIn = POPULAR_BRANDS.find(b => b.name.toLowerCase() === cleanBrand.toLowerCase());
      const newCustomBrand: VehicleBrandData = {
        id: `custom_${Date.now()}_${cleanBrand}`,
        name: builtIn ? builtIn.name : cleanBrand,
        vehicleType: builtIn ? builtIn.vehicleType : 'CAR',
        category: builtIn ? builtIn.category : 'Özel / Kayıtlı',
        models: [cleanModel],
        isCustom: true,
      };
      updated = [newCustomBrand, ...currentCustom];
    }

    await AsyncStorage.setItem(STORAGE_CUSTOM_VEHICLES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Standart liste ile kullanıcının özel eklediği markaları birleştirir
 */
export function getMergedBrands(customList: VehicleBrandData[] = []): VehicleBrandData[] {
  const brandMap = new Map<string, VehicleBrandData>();

  for (const b of POPULAR_BRANDS) {
    brandMap.set(b.name.toLowerCase(), { ...b, models: [...b.models] });
  }

  for (const c of customList) {
    const key = c.name.toLowerCase();
    if (brandMap.has(key)) {
      const existing = brandMap.get(key)!;
      for (const m of c.models) {
        if (!existing.models.some(em => em.toLowerCase() === m.toLowerCase())) {
          existing.models.unshift(m);
        }
      }
    } else {
      brandMap.set(key, c);
    }
  }

  return Array.from(brandMap.values());
}

/**
 * Seçili markaya ait hem standart hem de özel kayıtlı modelleri getirir
 */
export function getModelsForBrand(brandName?: string | null, customList: VehicleBrandData[] = []): string[] {
  if (!brandName || !brandName.trim()) return [];
  const clean = brandName.trim().toLowerCase();
  const allBrands = getMergedBrands(customList);
  const found = allBrands.find(b => b.name.toLowerCase() === clean);
  return found ? found.models : [];
}

/**
 * Türkiye Plaka Standartlarına uygun formatlama
 * Örn: "34abc123" -> "34 ABC 123"
 * Örn: "06kws90" -> "06 KWS 90"
 * Örn: "35ymh12" -> "35 YMH 12"
 * Örn: "16ktm39" -> "16 KTM 39"
 * Türkçe harf diyakritiklerini (Ç, Ğ, İ, Ö, Ş, Ü) standart plaka harflerine (C, G, I, O, S, U) çevirir ve büyük harf yapar.
 */
export function formatPlateTR(input: string): string {
  if (!input) return '';

  let raw = input
    .toLocaleUpperCase('tr-TR')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/i/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, '');

  if (!raw) return '';

  let province = '';
  let letters = '';
  let numbers = '';

  let idx = 0;
  while (idx < raw.length && idx < 2 && /[0-9]/.test(raw[idx])) {
    province += raw[idx];
    idx++;
  }

  if (province.length === 0) {
    return raw.slice(0, 11);
  }

  while (idx < raw.length && letters.length < 3 && /[A-Z]/.test(raw[idx])) {
    letters += raw[idx];
    idx++;
  }

  while (idx < raw.length && numbers.length < 5 && /[0-9]/.test(raw[idx])) {
    numbers += raw[idx];
    idx++;
  }

  let result = province;
  if (letters.length > 0) {
    result += ' ' + letters;
    if (numbers.length > 0) {
      result += ' ' + numbers;
    }
  } else if (idx < raw.length) {
    result += ' ' + raw.slice(idx);
  }

  return result.trim();
}

/**
 * Araç ve plaka metnini akıllıca ayrıştırır 
 * Örn: "Fiat Egea (34 ABC 789)" -> Marka: "Fiat", Model: "Egea", Plaka: "34 ABC 789"
 * Örn: "Honda NC750X (34 ABC 789)" -> Marka: "Honda", Model: "NC750X", Plaka: "34 ABC 789"
 */
export function parseVehicleInfo(vehicleInfo?: string | null, fallbackPlate?: string | null) {
  let extractedPlate = (fallbackPlate || '').trim().toUpperCase();

  if (!vehicleInfo || !vehicleInfo.trim()) {
    return { brand: '', model: '', plate: extractedPlate };
  }

  let text = vehicleInfo.trim();

  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    if (!extractedPlate) {
      extractedPlate = parenMatch[1].trim().toUpperCase();
    }
    text = text.replace(parenMatch[0], '').trim();
  } else {
    const plakaMatch = text.match(/Plaka:\s*([A-Za-z0-9\s]+)/i);
    if (plakaMatch) {
      if (!extractedPlate) {
        extractedPlate = plakaMatch[1].trim().toUpperCase();
      }
      text = text.replace(plakaMatch[0], '').trim();
    }
  }

  let brand = '';
  let model = '';

  const matched = POPULAR_BRANDS.find(b => new RegExp(`^${b.name}\\b`, 'i').test(text));
  if (matched) {
    brand = matched.name;
    model = text.substring(matched.name.length).trim();
  } else {
    const parts = text.split(/\s+/);
    if (parts.length > 1) {
      brand = parts[0];
      model = parts.slice(1).join(' ');
    } else {
      brand = parts[0] || '';
      model = '';
    }
  }

  return { brand, model, plate: extractedPlate };
}
