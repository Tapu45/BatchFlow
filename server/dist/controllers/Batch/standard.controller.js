"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardController = void 0;
const prisma_1 = require("../../generated/prisma");
const uuid_1 = require("uuid");
const prisma = new prisma_1.PrismaClient();
class StandardController {
    // Standard operations
    // Create a new standard
    // async createStandard(req: Request, res: Response): Promise<void> {
    //   try {
    //     if (!req.user || typeof req.user !== 'object' || !('id' in req.user)) {
    //       res.status(401).json({ message: 'Unauthorized: Invalid user information' });
    //       return;
    //     }
    //     const userId = req.user.id;
    //     const { 
    //       name, 
    //       code, 
    //       description, 
    //       categoryId, 
    //       methodologyIds, 
    //       unitIds,
    //       parameterDefinitions 
    //     } = req.body;
    //     // Validate required fields
    //     if (!name || !code || !description || !categoryId) {
    //       res.status(400).json({ message: 'Missing required fields' });
    //       return;
    //     }
    //     // Check if standard with same name or code already exists
    //     const existingStandard = await prisma.standard.findFirst({
    //       where: {
    //         OR: [{ name }, { code }],
    //       },
    //     });
    //     if (existingStandard) {
    //       res.status(400).json({ message: 'Standard with this name or code already exists' });
    //       return;
    //     }
    //     // Check if category exists
    //     const category = await prisma.standardCategory.findUnique({
    //       where: { id: categoryId },
    //     });
    //     if (!category) {
    //       res.status(404).json({ message: 'Standard category not found' });
    //       return;
    //     }
    //     const standardId = uuidv4();
    //     // Create new standard
    //     const standard = await prisma.standard.create({
    //       data: {
    //         id: standardId,
    //         name,
    //         code,
    //         description,
    //         categoryId,
    //         createdById: userId,
    //         status: StandardStatus.ACTIVE,
    //         updatedAt: new Date(),
    //         methodologies: methodologyIds?.length ? {
    //           connect: methodologyIds.map((id: string) => ({ id }))
    //         } : undefined,
    //         units: unitIds?.length ? {
    //           connect: unitIds.map((id: string) => ({ id }))
    //         } : undefined,
    //       },
    //     });
    //     // Create parameter definitions if provided
    //     if (parameterDefinitions && parameterDefinitions.length > 0) {
    //       for (const def of parameterDefinitions) {
    //         const definitionId = uuidv4();
    //         await prisma.standardDefinition.create({
    //           data: {
    //             id: definitionId,
    //             parameterId: def.parameterId,
    //             standardValue: def.standardValue,
    //             unitId: def.unitId,
    //             methodologyId: def.methodologyId,
    //             createdById: userId,
    //             status: StandardStatus.ACTIVE,
    //             updatedAt: new Date(),
    //             standards: {
    //               connect: [{ id: standardId }]
    //             }
    //           }
    //         });
    //       }
    //     }
    //     // Log activity
    //     await prisma.activityLog.create({
    //       data: {
    //         id: uuidv4(),
    //         userId,
    //         action: 'CREATE_STANDARD',
    //         details: `Created standard ${name} (${code})`,
    //       },
    //     });
    //     // Fetch the complete standard with all relations
    //     const createdStandardWithRelations = await prisma.standard.findUnique({
    //       where: { id: standardId },
    //       include: {
    //         Category: true,
    //         CreatedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         methodologies: true,
    //         units: true,
    //         definitions: {
    //           include: {
    //             parameter: true,
    //             unit: true,
    //             methodology: true
    //           }
    //         }
    //       }
    //     });
    //     res.status(201).json({
    //       message: 'Standard created successfully',
    //       standard: createdStandardWithRelations,
    //     });
    //   } catch (error) {
    //     console.error('Create standard error:', error);
    //     res.status(500).json({ message: 'Internal server error' });
    //   }
    // }
    // // Get all standards with filtering
    // async getStandards(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { name, code, categoryId, status } = req.query;
    //     // Build where conditions
    //     const whereConditions: any = {};
    //     if (name) {
    //       whereConditions.name = {
    //         contains: name as string,
    //         mode: 'insensitive'
    //       };
    //     }
    //     if (code) {
    //       whereConditions.code = {
    //         contains: code as string,
    //         mode: 'insensitive'
    //       };
    //     }
    //     if (categoryId) {
    //       whereConditions.categoryId = categoryId as string;
    //     }
    //     if (status) {
    //       whereConditions.status = status as StandardStatus;
    //     }
    //     // Get standards with pagination
    //     const page = parseInt(req.query.page as string) || 1;
    //     const limit = parseInt(req.query.limit as string) || 10;
    //     const skip = (page - 1) * limit;
    //     const standards = await prisma.standard.findMany({
    //       where: whereConditions,
    //       skip,
    //       take: limit,
    //       orderBy: {
    //         createdAt: 'desc'
    //       },
    //       include: {
    //         Category: true,
    //         CreatedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         ModifiedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         methodologies: true,
    //         units: true,
    //         definitions: {
    //           include: {
    //             parameter: true,
    //             unit: true,
    //             methodology: true
    //           }
    //         }
    //       }
    //     });
    //     // Get total count for pagination
    //     const totalCount = await prisma.standard.count({
    //       where: whereConditions
    //     });
    //     res.status(200).json({
    //       standards,
    //       pagination: {
    //         page,
    //         limit,
    //         totalCount,
    //         totalPages: Math.ceil(totalCount / limit)
    //       }
    //     });
    //   } catch (error) {
    //     console.error('Get standards error:', error);
    //     res.status(500).json({ message: 'Internal server error' });
    //   }
    // }
    // // Get standard by ID
    // async getStandardById(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { id } = req.params;
    //     const standard = await prisma.standard.findUnique({
    //       where: { id },
    //       include: {
    //         Category: true,
    //         CreatedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         ModifiedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         methodologies: true,
    //         units: true,
    //         definitions: {
    //           include: {
    //             parameter: true,
    //             unit: true,
    //             methodology: true,
    //             CreatedBy: {
    //               select: {
    //                 id: true,
    //                 name: true
    //               }
    //             }
    //           }
    //         }
    //       }
    //     });
    //     if (!standard) {
    //       res.status(404).json({ message: 'Standard not found' });
    //       return;
    //     }
    //     res.status(200).json({ standard });
    //   } catch (error) {
    //     console.error('Get standard by ID error:', error);
    //     res.status(500).json({ message: 'Internal server error' });
    //   }
    // }
    // // Update a standard
    // async updateStandard(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { id } = req.params;
    //     if (!req.user) {
    //       res.status(401).json({ message: 'Unauthorized' });
    //       return;
    //     }
    //     const userId = req.user.id;
    //     const { 
    //       name, 
    //       code, 
    //       description, 
    //       categoryId, 
    //       status,
    //       methodologyIds,
    //       unitIds,
    //       parameterDefinitions
    //     } = req.body;
    //     // Check if standard exists
    //     const existingStandard = await prisma.standard.findUnique({
    //       where: { id },
    //       include: {
    //         methodologies: true,
    //         units: true,
    //         definitions: true
    //       }
    //     });
    //     if (!existingStandard) {
    //       res.status(404).json({ message: 'Standard not found' });
    //       return;
    //     }
    //     // Check for duplicate name or code (excluding current record)
    //     const duplicateCheck = await prisma.standard.findFirst({
    //       where: {
    //         OR: [
    //           { name },
    //           { code }
    //         ],
    //         NOT: {
    //           id
    //         }
    //       }
    //     });
    //     if (duplicateCheck) {
    //       res.status(400).json({ message: 'Another standard with this name or code already exists' });
    //       return;
    //     }
    //     // Update standard
    //     const updatedStandard = await prisma.standard.update({
    //       where: { id },
    //       data: {
    //         name: name || undefined,
    //         code: code || undefined,
    //         description: description || undefined,
    //         categoryId: categoryId || undefined,
    //         status: status as StandardStatus || undefined,
    //         modifiedById: userId,
    //         updatedAt: new Date(),
    //         // Update related methodologies if provided
    //         methodologies: methodologyIds ? {
    //           set: methodologyIds.map((id: string) => ({ id }))
    //         } : undefined,
    //         // Update related units if provided
    //         units: unitIds ? {
    //           set: unitIds.map((id: string) => ({ id }))
    //         } : undefined
    //       }
    //     });
    //     // Update parameter definitions
    //     if (parameterDefinitions && parameterDefinitions.length > 0) {
    //       // Get existing definition IDs for this standard
    //       const existingDefinitionIds = existingStandard.definitions.map(def => def.id);
    //       // Process each definition
    //       for (const def of parameterDefinitions) {
    //         if (def.id) {
    //           // Update existing definition
    //           await prisma.standardDefinition.update({
    //             where: { id: def.id },
    //             data: {
    //               standardValue: def.standardValue,
    //               unitId: def.unitId,
    //               methodologyId: def.methodologyId,
    //               modifiedById: userId,
    //               updatedAt: new Date()
    //             }
    //           });
    //         } else {
    //           // Create new definition
    //           const newDefinition = await prisma.standardDefinition.create({
    //             data: {
    //               id: uuidv4(),
    //               parameterId: def.parameterId,
    //               standardValue: def.standardValue,
    //               unitId: def.unitId,
    //               methodologyId: def.methodologyId,
    //               createdById: userId,
    //               status: StandardStatus.ACTIVE,
    //               updatedAt: new Date(),
    //               standards: {
    //                 connect: [{ id }]
    //               }
    //             }
    //           });
    //         }
    //       }
    //       // Handle definition removal (definitions in existingDefinitionIds not in parameterDefinitions)
    //       const updatedDefinitionIds = parameterDefinitions
    //         .filter((def: { id: any; }) => def.id)
    //         .map((def: { id: any; }) => def.id);
    //       const definitionsToRemove = existingDefinitionIds.filter(
    //         defId => !updatedDefinitionIds.includes(defId)
    //       );
    //       if (definitionsToRemove.length > 0) {
    //         // Disconnect definitions from this standard
    //         for (const defId of definitionsToRemove) {
    //           await prisma.standardDefinition.update({
    //             where: { id: defId },
    //             data: {
    //               standards: {
    //                 disconnect: [{ id }]
    //               }
    //             }
    //           });
    //         }
    //       }
    //     }
    //     // Log activity
    //     await prisma.activityLog.create({
    //       data: {
    //         id: uuidv4(),
    //         userId,
    //         action: 'UPDATE_STANDARD',
    //         details: `Updated standard ${existingStandard.name}`,
    //       }
    //     });
    //     // Get the updated standard with all relations
    //     const updatedStandardWithRelations = await prisma.standard.findUnique({
    //       where: { id },
    //       include: {
    //         Category: true,
    //         CreatedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         ModifiedBy: {
    //           select: {
    //             id: true,
    //             name: true,
    //             email: true
    //           }
    //         },
    //         methodologies: true,
    //         units: true,
    //         definitions: {
    //           include: {
    //             parameter: true,
    //             unit: true,
    //             methodology: true
    //           }
    //         }
    //       }
    //     });
    //     res.status(200).json({
    //       message: 'Standard updated successfully',
    //       standard: updatedStandardWithRelations
    //     });
    //   } catch (error) {
    //     console.error('Update standard error:', error);
    //     res.status(500).json({ message: 'Internal server error' });
    //   }
    // }
    // // Delete a standard
    // async deleteStandard(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { id } = req.params;
    //     if (!req.user) {
    //       res.status(401).json({ message: 'Unauthorized' });
    //       return;
    //     }
    //     const userId = req.user.id;
    //     // Check if standard exists
    //     const existingStandard = await prisma.standard.findUnique({
    //       where: { id },
    //       include: {
    //         definitions: true
    //       }
    //     });
    //     if (!existingStandard) {
    //       res.status(404).json({ message: 'Standard not found' });
    //       return;
    //     }
    //     // Check if standard is being used in any batches
    //     const batchUsage = await prisma.batch.findFirst({
    //       where: {
    //         standards: {
    //           some: {
    //             id
    //           }
    //         }
    //       }
    //     });
    //     if (batchUsage) {
    //       res.status(400).json({ message: 'Cannot delete standard as it is being used in batches' });
    //       return;
    //     }
    //     // Disconnect all definitions from this standard
    //     for (const def of existingStandard.definitions) {
    //       await prisma.standardDefinition.update({
    //         where: { id: def.id },
    //         data: {
    //           standards: {
    //             disconnect: [{ id }]
    //           }
    //         }
    //       });
    //     }
    //     // Delete standard
    //     await prisma.standard.delete({
    //       where: { id }
    //     });
    //     // Log activity
    //     await prisma.activityLog.create({
    //       data: {
    //         id: uuidv4(),
    //         userId,
    //         action: 'DELETE_STANDARD',
    //         details: `Deleted standard ${existingStandard.name}`,
    //       }
    //     });
    //     res.status(200).json({ message: 'Standard deleted successfully' });
    //   } catch (error) {
    //     console.error('Delete standard error:', error);
    //     res.status(500).json({ message: 'Internal server error' });
    //   }
    // }
    // Standard Categories operations
    // Create a new standard category
    async createStandardCategory(req, res) {
        try {
            if (!req.user || typeof req.user !== 'object' || !('id' in req.user)) {
                res.status(401).json({ message: 'Unauthorized: Invalid user information' });
                return;
            }
            const userId = req.user.id;
            const { name, description } = req.body;
            // Validate required fields
            if (!name) {
                res.status(400).json({ message: 'Name is required' });
                return;
            }
            // Check if category with same name already exists
            const existingCategory = await prisma.standardCategory.findUnique({
                where: { name }
            });
            if (existingCategory) {
                res.status(400).json({ message: 'Category with this name already exists' });
                return;
            }
            // Create new category
            const category = await prisma.standardCategory.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    name,
                    description,
                    updatedAt: new Date()
                }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'CREATE_STANDARD_CATEGORY',
                    details: `Created standard category ${name}`,
                }
            });
            res.status(201).json({
                message: 'Standard category created successfully',
                category
            });
        }
        catch (error) {
            console.error('Create standard category error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Get all standard categories
    async getStandardCategories(req, res) {
        try {
            const categories = await prisma.standardCategory.findMany({
                orderBy: {
                    name: 'asc'
                }
            });
            res.status(200).json({ categories });
        }
        catch (error) {
            console.error('Get standard categories error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async updateStandardCategory(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            // Check if the category exists
            const existingCategory = await prisma.standardCategory.findUnique({
                where: { id },
            });
            if (!existingCategory) {
                res.status(404).json({ message: 'Standard category not found' });
                return;
            }
            // Check for duplicate name (excluding the current category)
            if (name && name !== existingCategory.name) {
                const duplicateCategory = await prisma.standardCategory.findUnique({
                    where: { name },
                });
                if (duplicateCategory) {
                    res.status(400).json({ message: 'Another category with this name already exists' });
                    return;
                }
            }
            // Update the category
            const updatedCategory = await prisma.standardCategory.update({
                where: { id },
                data: {
                    name: name || undefined,
                    description: description || undefined,
                    updatedAt: new Date(),
                },
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'UPDATE_STANDARD_CATEGORY',
                    details: `Updated standard category ${existingCategory.name}`,
                },
            });
            res.status(200).json({
                message: 'Standard category updated successfully',
                category: updatedCategory,
            });
        }
        catch (error) {
            console.error('Update standard category error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async deleteStandardCategory(req, res) {
        try {
            const { id } = req.params;
            const { force } = req.query; // Add force parameter
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            // Check if category exists
            const existingCategory = await prisma.standardCategory.findUnique({
                where: { id },
                include: {
                    parameters: {
                        include: {
                            products: true, // Check for ProductParameter usage
                            batchValues: true, // Check for BatchParameterValue usage
                            standards: true, // Check for StandardDefinition usage
                        },
                    },
                },
            });
            if (!existingCategory) {
                res.status(404).json({ message: 'Standard category not found' });
                return;
            }
            // Check if any parameters under this category are in use
            const parametersInUse = existingCategory.parameters.some((param) => param.products.length > 0 || param.batchValues.length > 0);
            if (parametersInUse && force !== 'true') {
                // Return detailed information about usage
                const usageDetails = existingCategory.parameters.map(param => ({
                    parameterName: param.name,
                    productsCount: param.products.length,
                    batchValuesCount: param.batchValues.length,
                    products: param.products.map(p => p.productId)
                })).filter(p => p.productsCount > 0 || p.batchValuesCount > 0);
                res.status(400).json({
                    message: 'Cannot delete category as some parameters are being used in products or batches',
                    canForceDelete: true,
                    usageDetails,
                    hint: 'Add ?force=true to force delete and clean up all references'
                });
                return;
            }
            // If force delete or no usage, proceed with cleanup
            if (parametersInUse && force === 'true') {
                console.log(`Force deleting category ${existingCategory.name} and cleaning up references...`);
                // Get all parameter IDs under this category
                const parameterIds = existingCategory.parameters.map(p => p.id);
                // Delete all BatchParameterValues that reference these parameters
                const deletedBatchValues = await prisma.batchParameterValue.deleteMany({
                    where: {
                        parameterId: { in: parameterIds }
                    }
                });
                // Delete all ProductParameters that reference these parameters
                const deletedProductParams = await prisma.productParameter.deleteMany({
                    where: {
                        parameterId: { in: parameterIds }
                    }
                });
                // Delete all StandardDefinitions that reference these parameters
                const deletedStandardDefs = await prisma.standardDefinition.deleteMany({
                    where: {
                        parameterId: { in: parameterIds }
                    }
                });
                console.log(`Cleanup completed:
        - Deleted ${deletedBatchValues.count} batch parameter values
        - Deleted ${deletedProductParams.count} product parameter links
        - Deleted ${deletedStandardDefs.count} standard definitions`);
            }
            // Delete all parameters under this category
            const deletedParams = await prisma.standardParameter.deleteMany({
                where: { categoryId: id },
            });
            // Delete the category
            await prisma.standardCategory.delete({
                where: { id },
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'DELETE_STANDARD_CATEGORY',
                    details: `${force === 'true' ? 'Force deleted' : 'Deleted'} standard category ${existingCategory.name} and ${deletedParams.count} associated parameters`,
                },
            });
            res.status(200).json({
                message: 'Standard category and associated parameters deleted successfully',
                deletedParametersCount: deletedParams.count,
                forceDeleted: force === 'true'
            });
        }
        catch (error) {
            console.error('Delete standard category error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Create a new unit of measurement
    async createUnit(req, res) {
        try {
            if (!req.user || typeof req.user !== 'object' || !('id' in req.user)) {
                res.status(401).json({ message: 'Unauthorized: Invalid user information' });
                return;
            }
            const userId = req.user.id;
            if (!userId) {
                res.status(400).json({ message: 'User ID is missing in the request' });
                return;
            }
            const { name, symbol, description } = req.body;
            // Validate required fields
            if (!name || !symbol) {
                res.status(400).json({ message: 'Name and symbol are required' });
                return;
            }
            // Check if unit with same name already exists
            const existingUnit = await prisma.unitOfMeasurement.findUnique({
                where: { name }
            });
            if (existingUnit) {
                res.status(400).json({ message: 'Unit with this name already exists' });
                return;
            }
            // Create new unit
            const unit = await prisma.unitOfMeasurement.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    name,
                    symbol,
                    description,
                    updatedAt: new Date()
                }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'CREATE_UNIT',
                    details: `Created unit of measurement ${name} (${symbol})`,
                }
            });
            res.status(201).json({
                message: 'Unit of measurement created successfully',
                unit
            });
        }
        catch (error) {
            console.error('Create unit error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Get all units of measurement
    async getUnits(req, res) {
        try {
            const units = await prisma.unitOfMeasurement.findMany({
                orderBy: {
                    name: 'asc'
                }
            });
            res.status(200).json({ units });
        }
        catch (error) {
            console.error('Get units error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Update a unit of measurement
    async updateUnit(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.userId;
            const { name, symbol, description } = req.body;
            // Check if unit exists
            const existingUnit = await prisma.unitOfMeasurement.findUnique({
                where: { id }
            });
            if (!existingUnit) {
                res.status(404).json({ message: 'Unit of measurement not found' });
                return;
            }
            // Check for duplicate name (excluding current record)
            if (name && name !== existingUnit.name) {
                const duplicateCheck = await prisma.unitOfMeasurement.findUnique({
                    where: { name }
                });
                if (duplicateCheck) {
                    res.status(400).json({ message: 'Another unit with this name already exists' });
                    return;
                }
            }
            // Update unit
            const updatedUnit = await prisma.unitOfMeasurement.update({
                where: { id },
                data: {
                    name: name || undefined,
                    symbol: symbol || undefined,
                    description: description || undefined,
                    updatedAt: new Date()
                }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'UPDATE_UNIT',
                    details: `Updated unit of measurement ${existingUnit.name}`,
                }
            });
            res.status(200).json({
                message: 'Unit of measurement updated successfully',
                unit: updatedUnit
            });
        }
        catch (error) {
            console.error('Update unit error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Delete a unit of measurement
    async deleteUnit(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.userId;
            // Check if unit exists
            const existingUnit = await prisma.unitOfMeasurement.findUnique({
                where: { id }
            });
            if (!existingUnit) {
                res.status(404).json({ message: 'Unit of measurement not found' });
                return;
            }
            // Check if unit is being used in definitions or batch values
            const standardDefinitionUsage = await prisma.standardDefinition.findFirst({
                where: { unitId: id }
            });
            const batchParameterValueUsage = await prisma.batchParameterValue.findFirst({
                where: { unitId: id }
            });
            if (standardDefinitionUsage || batchParameterValueUsage) {
                res.status(400).json({ message: 'Cannot delete unit as it is being used in standards or batch values' });
                return;
            }
            // Delete unit
            await prisma.unitOfMeasurement.delete({
                where: { id }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'DELETE_UNIT',
                    details: `Deleted unit of measurement ${existingUnit.name}`,
                }
            });
            res.status(200).json({ message: 'Unit of measurement deleted successfully' });
        }
        catch (error) {
            console.error('Delete unit error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Methodology operations
    // Create a new methodology
    async createMethodology(req, res) {
        try {
            if (!req.user || typeof req.user !== 'object' || !('id' in req.user)) {
                res.status(401).json({ message: 'Unauthorized: Invalid user information' });
                return;
            }
            const userId = req.user.id;
            const { name, description, procedure } = req.body;
            // Validate required fields
            if (!name || !description || !procedure) {
                res.status(400).json({ message: 'Name, description, and procedure are required' });
                return;
            }
            // Check if methodology with same name already exists
            const existingMethodology = await prisma.methodology.findUnique({
                where: { name }
            });
            if (existingMethodology) {
                res.status(400).json({ message: 'Methodology with this name already exists' });
                return;
            }
            // Create new methodology
            const methodology = await prisma.methodology.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    name,
                    description,
                    procedure,
                    updatedAt: new Date()
                }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'CREATE_METHODOLOGY',
                    details: `Created methodology ${name}`,
                }
            });
            res.status(201).json({
                message: 'Methodology created successfully',
                methodology
            });
        }
        catch (error) {
            console.error('Create methodology error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Get all methodologies
    async getMethodologies(req, res) {
        try {
            const { name } = req.query;
            // Build where conditions
            const whereConditions = {};
            if (name) {
                whereConditions.name = {
                    contains: name,
                    mode: 'insensitive'
                };
            }
            const methodologies = await prisma.methodology.findMany({
                where: whereConditions,
                orderBy: {
                    name: 'asc'
                }
            });
            res.status(200).json({ methodologies });
        }
        catch (error) {
            console.error('Get methodologies error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Get methodology by ID
    async getMethodologyById(req, res) {
        try {
            const { id } = req.params;
            const methodology = await prisma.methodology.findUnique({
                where: { id }
            });
            if (!methodology) {
                res.status(404).json({ message: 'Methodology not found' });
                return;
            }
            res.status(200).json({ methodology });
        }
        catch (error) {
            console.error('Get methodology by ID error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Update a methodology
    async updateMethodology(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.userId;
            const { name, description, procedure } = req.body;
            // Check if methodology exists
            const existingMethodology = await prisma.methodology.findUnique({
                where: { id }
            });
            if (!existingMethodology) {
                res.status(404).json({ message: 'Methodology not found' });
                return;
            }
            // Check for duplicate name (excluding current record)
            if (name && name !== existingMethodology.name) {
                const duplicateCheck = await prisma.methodology.findUnique({
                    where: { name }
                });
                if (duplicateCheck) {
                    res.status(400).json({ message: 'Another methodology with this name already exists' });
                    return;
                }
            }
            // Update methodology
            const updatedMethodology = await prisma.methodology.update({
                where: { id },
                data: {
                    name: name || undefined,
                    description: description || undefined,
                    procedure: procedure || undefined,
                    updatedAt: new Date()
                }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'UPDATE_METHODOLOGY',
                    details: `Updated methodology ${existingMethodology.name}`,
                }
            });
            res.status(200).json({
                message: 'Methodology updated successfully',
                methodology: updatedMethodology
            });
        }
        catch (error) {
            console.error('Update methodology error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Delete a methodology
    async deleteMethodology(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.userId;
            // Check if methodology exists
            const existingMethodology = await prisma.methodology.findUnique({
                where: { id }
            });
            if (!existingMethodology) {
                res.status(404).json({ message: 'Methodology not found' });
                return;
            }
            // Delete methodology
            await prisma.methodology.delete({
                where: { id }
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'DELETE_METHODOLOGY',
                    details: `Deleted methodology ${existingMethodology.name}`,
                }
            });
            res.status(200).json({ message: 'Methodology deleted successfully' });
        }
        catch (error) {
            console.error('Delete methodology error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Create a new standard parameter
    async createStandardParameter(req, res) {
        try {
            if (!req.user || typeof req.user !== 'object' || !('id' in req.user)) {
                res.status(401).json({ message: 'Unauthorized: Invalid user information' });
                return;
            }
            const userId = req.user.id;
            const { name, categoryId, description, dataType, standardValue, // Expected value
            unitId // Unit of measurement
             } = req.body;
            // Validate required fields
            if (!name || !categoryId || !dataType) {
                res.status(400).json({ message: 'Name, category, and data type are required' });
                return;
            }
            // Check if category exists
            const category = await prisma.standardCategory.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                res.status(404).json({ message: 'Standard category not found' });
                return;
            }
            // Start a transaction to ensure parameter and definition are created together
            const result = await prisma.$transaction(async (tx) => {
                // Create new parameter
                const parameter = await tx.standardParameter.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        name,
                        categoryId,
                        description,
                        dataType: dataType,
                        updatedAt: new Date()
                    },
                    include: {
                        category: true
                    }
                });
                // If standard definition information is provided, create it 
                // without requiring a standard ID
                let standardDefinition = null;
                if (standardValue) {
                    standardDefinition = await tx.standardDefinition.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            parameterId: parameter.id,
                            standardValue,
                            unitId: unitId || null,
                            createdById: userId,
                            status: 'ACTIVE',
                            updatedAt: new Date()
                        },
                        include: {
                            unit: true,
                            methodology: true
                        }
                    });
                }
                return {
                    parameter,
                    standardDefinition
                };
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'CREATE_STANDARD_PARAMETER',
                    details: `Created standard parameter ${name}${result.standardDefinition ? ' with standard value' : ''}`,
                }
            });
            res.status(201).json({
                message: 'Standard parameter created successfully',
                parameter: result.parameter,
                standardDefinition: result.standardDefinition
            });
        }
        catch (error) {
            console.error('Create standard parameter error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    // Get all standard parameters with optional filtering
    async getStandardParameters(req, res) {
        try {
            const { name, categoryId } = req.query;
            // Build where conditions
            const whereConditions = {};
            if (name) {
                whereConditions.name = {
                    contains: name,
                    mode: 'insensitive'
                };
            }
            if (categoryId) {
                whereConditions.categoryId = categoryId;
            }
            const parameters = await prisma.standardParameter.findMany({
                where: whereConditions,
                include: {
                    category: true
                },
                orderBy: {
                    name: 'asc'
                }
            });
            res.status(200).json({ parameters });
        }
        catch (error) {
            console.error('Get standard parameters error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async updateStandardParameter(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            const { name, categoryId, description, dataType, unitId } = req.body;
            // Check if parameter exists
            const existingParameter = await prisma.standardParameter.findUnique({
                where: { id },
            });
            if (!existingParameter) {
                res.status(404).json({ message: 'Standard parameter not found' });
                return;
            }
            // Check for duplicate name within the same category (excluding current record)
            if (name && name !== existingParameter.name) {
                const duplicateCheck = await prisma.standardParameter.findFirst({
                    where: {
                        name,
                        categoryId: categoryId || existingParameter.categoryId,
                        NOT: { id },
                    },
                });
                if (duplicateCheck) {
                    res.status(400).json({ message: 'Another parameter with this name exists in the category' });
                    return;
                }
            }
            // Update parameter
            const updatedParameter = await prisma.standardParameter.update({
                where: { id },
                data: {
                    name: name || undefined,
                    categoryId: categoryId || undefined,
                    description: description || undefined,
                    dataType: dataType || undefined,
                    unitId: unitId || undefined,
                    updatedAt: new Date(),
                },
                include: {
                    category: true,
                    unit: true,
                },
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'UPDATE_STANDARD_PARAMETER',
                    details: `Updated standard parameter ${existingParameter.name}`,
                },
            });
            res.status(200).json({
                message: 'Standard parameter updated successfully',
                parameter: updatedParameter,
            });
        }
        catch (error) {
            console.error('Update standard parameter error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    async deleteStandardParameter(req, res) {
        try {
            const { id } = req.params;
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const userId = req.user.id;
            // Check if parameter exists
            const existingParameter = await prisma.standardParameter.findUnique({
                where: { id },
                include: {
                    products: true, // Check for ProductParameter usage
                    batchValues: true, // Check for BatchParameterValue usage
                },
            });
            if (!existingParameter) {
                res.status(404).json({ message: 'Standard parameter not found' });
                return;
            }
            // Delete parameter
            await prisma.standardParameter.delete({
                where: { id },
            });
            // Log activity
            await prisma.activityLog.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    userId,
                    action: 'DELETE_STANDARD_PARAMETER',
                    details: `Deleted standard parameter ${existingParameter.name}`,
                },
            });
            res.status(200).json({ message: 'Standard parameter deleted successfully' });
        }
        catch (error) {
            console.error('Delete standard parameter error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}
exports.StandardController = StandardController;
exports.default = new StandardController();
