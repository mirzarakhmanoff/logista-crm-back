import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deal, DealStage } from './schemas/deal.schema';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { FilterDealDto } from './dto/filter-deal.dto';
import { UpdateDealStageDto } from './dto/update-stage.dto';
import { MoveDealKanbanDto, ReorderDealsDto } from './dto/kanban.dto';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class DealsService {
  constructor(
    @InjectModel(Deal.name) private dealModel: Model<Deal>,
    private socketGateway: SocketGateway,
  ) {}

  async create(createDealDto: CreateDealDto, createdById: string): Promise<Deal> {
    const initialStage = createDealDto.stage || DealStage.NEW_REQUEST;

    const maxPosition = await this.dealModel
      .findOne({ stage: initialStage })
      .sort({ position: -1 })
      .select('position')
      .exec();

    const deal = new this.dealModel({
      ...createDealDto,
      createdBy: createdById,
      position: maxPosition ? maxPosition.position + 1 : 0,
      stageHistory: [
        {
          stage: initialStage,
          changedAt: new Date(),
          changedBy: createdById,
        },
      ],
    });

    const savedDeal = await deal.save();
    const populatedDeal = await this.populateDeal(savedDeal._id);

    if (!populatedDeal) {
      throw new NotFoundException('Failed to create deal');
    }

    this.socketGateway.emitToAll('dealCreated', populatedDeal);

    return populatedDeal;
  }

  async findAll(filterDto: FilterDealDto): Promise<Deal[]> {
    const query: any = {};

    if (filterDto.isArchived !== undefined) {
      query.isArchived = filterDto.isArchived;
    } else {
      query.isArchived = false;
    }

    if (filterDto.stage) query.stage = filterDto.stage;
    if (filterDto.priority) query.priority = filterDto.priority;
    if (filterDto.client) query.client = filterDto.client;
    if (filterDto.assignedTo) query.assignedTo = filterDto.assignedTo;

    if (filterDto.originCity) {
      query['origin.city'] = { $regex: filterDto.originCity, $options: 'i' };
    }
    if (filterDto.destinationCity) {
      query['destination.city'] = { $regex: filterDto.destinationCity, $options: 'i' };
    }

    if (filterDto.minAmount || filterDto.maxAmount) {
      query.amount = {};
      if (filterDto.minAmount) query.amount.$gte = filterDto.minAmount;
      if (filterDto.maxAmount) query.amount.$lte = filterDto.maxAmount;
    }

    if (filterDto.dateFrom || filterDto.dateTo) {
      query.createdAt = {};
      if (filterDto.dateFrom) query.createdAt.$gte = new Date(filterDto.dateFrom);
      if (filterDto.dateTo) query.createdAt.$lte = new Date(filterDto.dateTo);
    }

    if (filterDto.search) {
      query.$or = [
        { name: { $regex: filterDto.search, $options: 'i' } },
        { dealNumber: { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    return this.dealModel
      .find(query)
      .populate('client', 'companyName clientNumber supportLevel')
      .populate('assignedTo', 'fullName avatar email')
      .populate('createdBy', 'fullName avatar email')
      .sort({ position: 1, createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Deal> {
    const deal = await this.populateDeal(id);

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto, userId: string): Promise<Deal> {
    const deal = await this.dealModel
      .findByIdAndUpdate(id, updateDealDto, { new: true })
      .exec();

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    const populatedDeal = await this.populateDeal(id);

    this.socketGateway.emitToAll('dealUpdated', populatedDeal);

    return populatedDeal!;
  }

  async updateStage(
    id: string,
    updateStageDto: UpdateDealStageDto,
    userId: string,
  ): Promise<Deal> {
    const deal = await this.findOne(id);
    const oldStage = deal.stage;

    const maxPosition = await this.dealModel
      .findOne({ stage: updateStageDto.stage })
      .sort({ position: -1 })
      .select('position')
      .exec();

    const updateData: any = {
      stage: updateStageDto.stage,
      position: maxPosition ? maxPosition.position + 1 : 0,
      $push: {
        stageHistory: {
          stage: updateStageDto.stage,
          changedAt: new Date(),
          changedBy: userId,
          comment: updateStageDto.comment,
        },
      },
    };

    if (updateStageDto.stage === DealStage.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updatedDeal = await this.dealModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedDeal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    const populatedDeal = await this.populateDeal(id);

    this.socketGateway.emitToAll('dealStageChanged', {
      dealId: id,
      oldStage,
      newStage: updateStageDto.stage,
      deal: populatedDeal,
    });

    return populatedDeal!;
  }

  async moveDealKanban(
    id: string,
    moveDealDto: MoveDealKanbanDto,
    userId: string,
  ): Promise<Deal> {
    const deal = await this.findOne(id);
    const oldStage = deal.stage;

    const updateData: any = {
      stage: moveDealDto.targetStage,
      position: moveDealDto.position,
    };

    if (oldStage !== moveDealDto.targetStage) {
      updateData.$push = {
        stageHistory: {
          stage: moveDealDto.targetStage,
          changedAt: new Date(),
          changedBy: userId,
        },
      };

      if (moveDealDto.targetStage === DealStage.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }

    const updatedDeal = await this.dealModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedDeal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    const populatedDeal = await this.populateDeal(id);

    this.socketGateway.emitToAll('dealKanbanMoved', {
      dealId: id,
      oldStage,
      newStage: moveDealDto.targetStage,
      position: moveDealDto.position,
      deal: populatedDeal,
    });

    return populatedDeal!;
  }

  async reorderDeals(reorderDto: ReorderDealsDto): Promise<void> {
    const bulkOps = reorderDto.dealIds.map((dealId, index) => ({
      updateOne: {
        filter: { _id: dealId, stage: reorderDto.stage },
        update: { $set: { position: index } },
      },
    }));

    await this.dealModel.bulkWrite(bulkOps);

    this.socketGateway.emitToAll('dealsReordered', {
      stage: reorderDto.stage,
      dealIds: reorderDto.dealIds,
    });
  }

  async getKanbanView(): Promise<{ [key in DealStage]?: Deal[] }> {
    const deals = await this.dealModel
      .find({ isArchived: false })
      .populate('client', 'companyName clientNumber supportLevel')
      .populate('assignedTo', 'fullName avatar')
      .sort({ position: 1 })
      .exec();

    const kanbanData: { [key in DealStage]?: Deal[] } = {};

    Object.values(DealStage).forEach((stage) => {
      kanbanData[stage] = [];
    });

    deals.forEach((deal) => {
      kanbanData[deal.stage]?.push(deal);
    });

    return kanbanData;
  }

  async getDealsByStage(stage: DealStage): Promise<Deal[]> {
    return this.dealModel
      .find({ stage, isArchived: false })
      .populate('client', 'companyName clientNumber supportLevel')
      .populate('assignedTo', 'fullName avatar')
      .sort({ position: 1 })
      .exec();
  }

  async remove(id: string): Promise<void> {
    const result = await this.dealModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    this.socketGateway.emitToAll('dealDeleted', { dealId: id });
  }

  async getDealStats() {
    const byStage = await this.dealModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const total = await this.dealModel.countDocuments({ isArchived: false });
    const totalAmount = await this.dealModel.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      byStage,
      total,
      totalAmount: totalAmount[0]?.total || 0,
    };
  }

  async getPipelineStats() {
    const stats = await this.dealModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          totalWeight: { $sum: '$cargo.weight' },
          totalVolume: { $sum: '$cargo.volume' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalDeals = await this.dealModel.countDocuments({ isArchived: false });
    const completedDeals = await this.dealModel.countDocuments({
      stage: DealStage.COMPLETED,
      isArchived: false,
    });

    return {
      byStage: stats,
      totalDeals,
      completedDeals,
      conversionRate: totalDeals > 0 ? (completedDeals / totalDeals) * 100 : 0,
    };
  }

  async findByClient(clientId: string): Promise<Deal[]> {
    return this.dealModel
      .find({ client: clientId })
      .populate('assignedTo', 'fullName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  private async populateDeal(id: any): Promise<Deal | null> {
    return this.dealModel
      .findById(id)
      .populate('client', 'companyName clientNumber supportLevel type email phone')
      .populate('assignedTo', 'fullName avatar email phone')
      .populate('createdBy', 'fullName avatar email')
      .populate('stageHistory.changedBy', 'fullName avatar')
      .populate('attachedDocuments.addedBy', 'fullName avatar')
      .exec();
  }
}
