"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivityLog = void 0;
exports.convertToBaseUOM = convertToBaseUOM;
const prisma_1 = require("../../generated/prisma");
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
const createActivityLog = async (params) => {
    try {
        const { userId, action, details, batchId } = params;
        await prisma.activityLog.create({
            data: {
                id: (0, uuid_1.v4)(),
                userId,
                action,
                details,
                batchId,
            },
        });
    }
    catch (error) {
        console.error('Error creating activity log:', error);
        // Don't throw the error to prevent disrupting the main flow
    }
};
exports.createActivityLog = createActivityLog;
/**
 * Converts a quantity from one unit to the base unit.
 * Supported base units: kg, litre, piece
 * Supported conversions: g <-> kg, ml <-> litre
 */
function convertToBaseUOM(quantity, fromUnit, baseUnit) {
    const from = fromUnit.toLowerCase().trim();
    const base = baseUnit.toLowerCase().trim();
    const conversions = {
        ton: { ton: 1, tonne: 1, tonnes: 1, tons: 1, kg: 1 / 1000, g: 1 / 1000000 },
        tonne: { ton: 1, tonne: 1, tonnes: 1, tons: 1, kg: 1 / 1000, g: 1 / 1000000 },
        tonnes: { ton: 1, tonne: 1, tonnes: 1, tons: 1, kg: 1 / 1000, g: 1 / 1000000 },
        tons: { ton: 1, tonne: 1, tonnes: 1, tons: 1, kg: 1 / 1000, g: 1 / 1000000 },
        kg: { kg: 1, g: 1 / 1000, ton: 1000, tonne: 1000, tonnes: 1000, tons: 1000 },
        g: { g: 1, kg: 1000, ton: 1000000, tonne: 1000000, tonnes: 1000000, tons: 1000000 },
        litre: { litre: 1, liter: 1, ml: 1 / 1000 },
        liter: { litre: 1, liter: 1, ml: 1 / 1000 },
        ml: { ml: 1, litre: 1000, liter: 1000 },
        piece: { piece: 1, pcs: 1 },
        pcs: { pcs: 1, piece: 1 },
    };
    if (!conversions[base] || !conversions[base][from]) {
        throw new Error(`Cannot convert from ${from} to ${base}`);
    }
    return quantity * conversions[base][from];
}
