"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../../src/generated/prisma");
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
async function main() {
    console.log('Starting seed data creation for hot pepper powder categories and parameters...');
    // Create units of measurement first, matching exactly what's in the COA
    const units = [
        {
            name: 'Percentage',
            symbol: '%',
            description: 'Percentage value'
        },
        {
            name: 'Weight/weight',
            symbol: '%w/w',
            description: 'Weight per weight percentage'
        },
        {
            name: 'Volume/weight',
            symbol: '%v/w',
            description: 'Volume per weight percentage'
        },
        {
            name: 'CFU per gram',
            symbol: 'cfu/g',
            description: 'Colony forming units per gram'
        },
        {
            name: 'SHU',
            symbol: 'SHU',
            description: 'Scoville Heat Units'
        },
        {
            name: 'ASTA',
            symbol: 'ASTA',
            description: 'American Spice Trade Association color value'
        },
        {
            name: 'PPB',
            symbol: 'ppb',
            description: 'Parts per billion'
        },
        {
            name: 'Microns',
            symbol: 'μm',
            description: 'Micrometers for particle size'
        },
        {
            name: 'Unitless',
            symbol: '-',
            description: 'Qualitative or descriptive parameter with no unit'
        },
        {
            name: 'CFU per 25 gram',
            symbol: '25g',
            description: 'Colony forming units per 25 grams'
        }
    ];
    const createdUnits = {};
    for (const unit of units) {
        const createdUnit = await prisma.unitOfMeasurement.upsert({
            where: { name: unit.name },
            update: {},
            create: {
                id: (0, uuid_1.v4)(),
                name: unit.name,
                symbol: unit.symbol,
                description: unit.description,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`Created unit: ${createdUnit.name} (${createdUnit.id})`);
        createdUnits[createdUnit.name] = createdUnit;
    }
    // Create the hot pepper powder product
    const hotPepperPowder = await prisma.product.upsert({
        where: { name: 'Hot Pepper powder' },
        update: {},
        create: {
            id: (0, uuid_1.v4)(),
            name: 'Hot Pepper powder',
            code: 'PEPPER-001',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    console.log(`Created product: ${hotPepperPowder.name} (${hotPepperPowder.id})`);
    // Create the standard categories matching what's in the COA
    const categories = [
        // Removed Organoleptic and Physical
        {
            name: 'Chemical Characteristics',
            description: 'Chemical composition and properties'
        },
        {
            name: 'Microbiology',
            description: 'Microbiological parameters'
        }
    ];
    const createdCategories = {};
    for (const category of categories) {
        const createdCategory = await prisma.standardCategory.upsert({
            where: { name: category.name },
            update: {},
            create: {
                id: (0, uuid_1.v4)(),
                name: category.name,
                description: category.description,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`Created standard category: ${createdCategory.name} (${createdCategory.id})`);
        createdCategories[createdCategory.name] = createdCategory;
        // Link category with product using ProductStandardCategory
        await prisma.productStandardCategory.upsert({
            where: {
                productId_categoryId: {
                    productId: hotPepperPowder.id,
                    categoryId: createdCategory.id
                }
            },
            update: {},
            create: {
                id: (0, uuid_1.v4)(),
                productId: hotPepperPowder.id,
                categoryId: createdCategory.id,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`Linked category ${createdCategory.name} with product ${hotPepperPowder.name}`);
    }
    // Create parameters for each category - Using names and units from the COA
    const parameters = [
        // --- Chemical Characteristics parameters (including moved sieve parameter) ---
        {
            name: 'Pass through US sieve #40 (min) 420mm',
            description: 'Percentage passing through 420mm sieve',
            categoryName: 'Chemical Characteristics',
            dataType: 'FLOAT',
            productType: 'PEPPER',
            unitName: 'Percentage', // % in COA
            standardValue: '95' // ADD THIS
        },
        {
            name: 'Moisture (max)',
            description: 'Maximum moisture content in pepper',
            categoryName: 'Chemical Characteristics',
            dataType: 'FLOAT',
            productType: 'PEPPER',
            unitName: 'Volume/weight', // %v/w in COA
            standardValue: '8' // ADD THIS
        },
        {
            name: 'Total Ash (max)',
            description: 'Maximum total ash content in pepper',
            categoryName: 'Chemical Characteristics',
            dataType: 'FLOAT',
            productType: 'PEPPER',
            unitName: 'Weight/weight', // %w/w in COA
            standardValue: '8' // ADD THIS
        },
        {
            name: 'Acid Insoluble Ash (max)',
            description: 'Maximum acid insoluble ash content in pepper',
            categoryName: 'Chemical Characteristics',
            dataType: 'FLOAT',
            productType: 'PEPPER',
            unitName: 'Weight/weight', // %w/w in COA
            standardValue: '1.5' // ADD THIS
        },
        {
            name: 'Scoville Heat (Capsaicin)',
            description: 'Scoville heat units - capsaicin content',
            categoryName: 'Chemical Characteristics',
            dataType: 'INTEGER',
            productType: 'PEPPER',
            unitName: 'SHU', // SHU in COA
            standardValue: '40,000-55,000' // ADD THIS - range value
        },
        {
            name: 'Colour Value',
            description: 'ASTA color value for pepper',
            categoryName: 'Chemical Characteristics',
            dataType: 'FLOAT',
            productType: 'PEPPER',
            unitName: 'ASTA', // ASTA in COA
            standardValue: '40' // ADD THIS
        },
        {
            name: 'Aflatoxin Total',
            description: 'Total aflatoxin content in pepper',
            categoryName: 'Chemical Characteristics',
            dataType: 'FLOAT',
            productType: 'PEPPER',
            unitName: 'PPB', // ppb in COA
            standardValue: '10' // ADD THIS
        },
        // --- Microbiology parameters ---
        {
            name: 'Total plate count',
            description: 'Total microbial plate count in pepper',
            categoryName: 'Microbiology',
            dataType: 'INTEGER',
            productType: 'PEPPER',
            unitName: 'CFU per gram', // cfu/g in COA
            standardValue: '10,000,000' // ADD THIS
        },
        {
            name: 'Yeast/mould',
            description: 'Yeast and mold count in pepper',
            categoryName: 'Microbiology',
            dataType: 'INTEGER',
            productType: 'PEPPER',
            unitName: 'CFU per gram', // cfu/g in COA
            standardValue: '1000' // ADD THIS
        },
        {
            name: 'Salmonella',
            description: 'Presence of Salmonella in pepper',
            categoryName: 'Microbiology',
            dataType: 'TEXT',
            productType: 'PEPPER',
            unitName: 'CFU per 25 gram', // 25g in COA
            standardValue: 'Absent' // ADD THIS
        },
        {
            name: 'Coliforms',
            description: 'Coliform bacteria count in pepper',
            categoryName: 'Microbiology',
            dataType: 'INTEGER',
            productType: 'PEPPER',
            unitName: 'CFU per gram', // cfu/g in COA
            standardValue: '100' // ADD THIS
        },
        {
            name: 'E.coli',
            description: 'E. coli count in pepper',
            categoryName: 'Microbiology',
            dataType: 'INTEGER',
            productType: 'PEPPER',
            unitName: 'CFU per gram', // cfu/g in COA
            standardValue: '<10' // ADD THIS
        },
        {
            name: 'Staph.aureus',
            description: 'Staphylococcus aureus count in pepper',
            categoryName: 'Microbiology',
            dataType: 'INTEGER',
            productType: 'PEPPER',
            unitName: 'CFU per gram', // cfu/g in COA
            standardValue: '<10' // ADD THIS
        }
    ];
    const createdParameters = [];
    for (const param of parameters) {
        // Find the category
        const category = createdCategories[param.categoryName];
        if (!category) {
            console.log(`Category not found for parameter: ${param.name}`);
            continue;
        }
        // Find the unit
        const unit = createdUnits[param.unitName];
        if (!unit) {
            console.log(`Unit not found for parameter: ${param.name}`);
            continue;
        }
        // Create the parameter with productType and unitId
        const parameterId = (0, uuid_1.v4)();
        const createdParam = await prisma.standardParameter.upsert({
            where: {
                name_categoryId_productType: {
                    name: param.name,
                    categoryId: category.id,
                    productType: param.productType || '',
                }
            },
            update: {
                description: param.description,
                dataType: param.dataType,
                unitId: unit.id,
                standardValue: param.standardValue, // ADD THIS
                updatedAt: new Date()
            },
            create: {
                id: parameterId,
                name: param.name,
                description: param.description,
                dataType: param.dataType,
                categoryId: category.id,
                productType: param.productType || '',
                unitId: unit.id,
                standardValue: param.standardValue, // ADD THIS
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`Created/Updated parameter: ${createdParam.name} (${createdParam.productType}) with unit ${param.unitName}`);
        createdParameters.push(createdParam);
        // Link parameter to hot pepper powder product
        await prisma.productParameter.upsert({
            where: {
                productId_parameterId: {
                    productId: hotPepperPowder.id,
                    parameterId: createdParam.id,
                }
            },
            update: {
                isRequired: true,
                updatedAt: new Date()
            },
            create: {
                id: (0, uuid_1.v4)(),
                productId: hotPepperPowder.id,
                parameterId: createdParam.id,
                isRequired: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`Linked parameter ${createdParam.name} to product ${hotPepperPowder.name}`);
    }
    console.log(`Created ${createdParameters.length} parameters for hot pepper powder`);
    console.log('Hot pepper powder seed data creation completed successfully!');
}
main()
    .catch((e) => {
    console.error('Error during seed data creation:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
