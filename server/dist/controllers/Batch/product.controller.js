"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const prisma_1 = require("../../generated/prisma");
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
class ProductController {
    // Create a new product
    async createProduct(req, res) {
        try {
            const { name, code } = req.body;
            if (!name) {
                res.status(400).json({ message: 'Product name is required' });
                return;
            }
            // Check if a product with the same name or code already exists
            const existingProduct = await prisma.product.findFirst({
                where: {
                    OR: [
                        { name },
                        { code }
                    ]
                }
            });
            if (existingProduct) {
                res.status(400).json({ message: 'Product with the same name or code already exists' });
                return;
            }
            // Create the product
            const product = await prisma.product.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    name,
                    code,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            res.status(201).json({
                message: 'Product created successfully',
                product
            });
        }
        catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getProducts(req, res) {
        try {
            const { name, code, page = 1, limit = 10 } = req.query;
            // Build filtering conditions
            const whereConditions = {};
            if (name) {
                whereConditions.name = { contains: name, mode: 'insensitive' };
            }
            if (code) {
                whereConditions.code = { contains: code, mode: 'insensitive' };
            }
            // Pagination
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);
            // Fetch products
            const products = await prisma.product.findMany({
                where: whereConditions,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            });
            // Get total count for pagination
            const totalCount = await prisma.product.count({
                where: whereConditions,
            });
            res.status(200).json({
                message: 'Products fetched successfully',
                products,
                pagination: {
                    totalCount,
                    totalPages: Math.ceil(totalCount / Number(limit)),
                    currentPage: Number(page),
                    limit: Number(limit),
                },
            });
        }
        catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
exports.ProductController = ProductController;
exports.default = new ProductController();
