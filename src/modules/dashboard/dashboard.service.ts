import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, RequestType, RequestSource, RequestStatusKey } from '../requests/schemas/request.schema';
import { IssuedCode, CodeStatus } from '../issued-codes/schemas/issued-code.schema';
import { Shipment, ShipmentStatus } from '../shipments/schemas/shipment.schema';
import { Invoice, InvoiceStatus } from '../invoices/schemas/invoice.schema';
import { Client, ClientType } from '../clients/schemas/client.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { Document, DocumentStatus, DocumentType, DocumentPriority } from '../documents/schemas/document.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Request.name) private requestModel: Model<Request>,
    @InjectModel(IssuedCode.name) private issuedCodeModel: Model<IssuedCode>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Document.name) private documentModel: Model<Document>,
  ) {}

  async getSummary(): Promise<any> {
    const [
      newClientsCount,
      ourClientsCount,
      newAgentsCount,
      ourAgentsCount,
      inWorkCount,
      activeCodesCount,
      shipmentsInTransitCount,
      unpaidInvoicesCount,
    ] = await Promise.all([
      this.requestModel.countDocuments({ type: RequestType.NEW_CLIENT }),
      this.requestModel.countDocuments({ type: RequestType.OUR_CLIENT }),
      this.requestModel.countDocuments({ type: RequestType.NEW_AGENT }),
      this.requestModel.countDocuments({ type: RequestType.OUR_AGENT }),
      this.requestModel.countDocuments({ statusKey: 'in_work' }),
      this.issuedCodeModel.countDocuments({ status: CodeStatus.ACTIVE }),
      this.shipmentModel.countDocuments({ status: ShipmentStatus.IN_TRANSIT }),
      this.invoiceModel.countDocuments({
        status: { $in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
      }),
    ]);

    return {
      newClients: newClientsCount,
      ourClients: ourClientsCount,
      newAgents: newAgentsCount,
      ourAgents: ourAgentsCount,
      inWork: inWorkCount,
      activeCodes: activeCodesCount,
      shipmentsInTransit: shipmentsInTransitCount,
      unpaidInvoices: unpaidInvoicesCount,
    };
  }

  async getRequestStats(): Promise<any> {
    const newClientStats = await this.requestModel.aggregate([
      { $match: { type: RequestType.NEW_CLIENT } },
      { $group: { _id: '$statusKey', count: { $sum: 1 } } },
    ]);

    const ourClientStats = await this.requestModel.aggregate([
      { $match: { type: RequestType.OUR_CLIENT } },
      { $group: { _id: '$statusKey', count: { $sum: 1 } } },
    ]);

    const newAgentStats = await this.requestModel.aggregate([
      { $match: { type: RequestType.NEW_AGENT } },
      { $group: { _id: '$statusKey', count: { $sum: 1 } } },
    ]);

    const ourAgentStats = await this.requestModel.aggregate([
      { $match: { type: RequestType.OUR_AGENT } },
      { $group: { _id: '$statusKey', count: { $sum: 1 } } },
    ]);

    return {
      newClient: newClientStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      ourClient: ourClientStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      newAgent: newAgentStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      ourAgent: ourAgentStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  async getFullStatistics(): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      // Overview counts
      totalRequests,
      totalClients,
      totalAgents,
      totalUsers,
      totalDocuments,
      totalShipments,
      totalInvoices,
      totalIssuedCodes,

      // Request statistics
      requestsByType,
      requestsByStatus,
      requestsBySource,
      requestsThisMonth,
      requestsMonthlyTrend,
      completedRequestsThisMonth,

      // Client statistics
      clientsThisMonth,
      clientsMonthlyTrend,

      // Document statistics
      documentsByStatus,
      documentsByType,
      documentsByPriority,
      documentsThisMonth,

      // Shipment statistics
      shipmentsByStatus,
      shipmentsThisMonth,
      deliveredThisMonth,

      // Invoice statistics
      invoicesByStatus,
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      revenueThisMonth,
      revenueMonthlyTrend,

      // User statistics
      usersByRole,
      activeUsers,

      // Issued codes statistics
      codesByStatus,
      codesThisMonth,
    ] = await Promise.all([
      // Overview counts
      this.requestModel.countDocuments(),
      this.clientModel.countDocuments({ type: ClientType.CLIENT }),
      this.clientModel.countDocuments({ type: ClientType.AGENT }),
      this.userModel.countDocuments(),
      this.documentModel.countDocuments(),
      this.shipmentModel.countDocuments(),
      this.invoiceModel.countDocuments(),
      this.issuedCodeModel.countDocuments(),

      // Request statistics
      this.requestModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.requestModel.aggregate([
        { $group: { _id: '$statusKey', count: { $sum: 1 } } },
      ]),
      this.requestModel.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      this.requestModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.requestModel.aggregate([
        { $match: { createdAt: { $gte: last12Months } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      this.requestModel.countDocuments({
        statusKey: RequestStatusKey.COMPLETED,
        updatedAt: { $gte: startOfMonth },
      }),

      // Client statistics
      this.clientModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.clientModel.aggregate([
        { $match: { createdAt: { $gte: last12Months } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              type: '$type',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Document statistics
      this.documentModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      this.documentModel.countDocuments({ createdAt: { $gte: startOfMonth } }),

      // Shipment statistics
      this.shipmentModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.shipmentModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.shipmentModel.countDocuments({
        status: ShipmentStatus.DELIVERED,
        actualArrivalDate: { $gte: startOfMonth },
      }),

      // Invoice statistics
      this.invoiceModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.invoiceModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $group: { _id: null, total: { $sum: '$paidAmount' } } },
      ]),
      this.invoiceModel.aggregate([
        {
          $match: { status: { $in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] } },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$amount', '$paidAmount'] } },
          },
        },
      ]),
      this.invoiceModel.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { createdAt: { $gte: last12Months } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            totalAmount: { $sum: '$amount' },
            paidAmount: { $sum: '$paidAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // User statistics
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      this.userModel.countDocuments({ isActive: true }),

      // Issued codes statistics
      this.issuedCodeModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.issuedCodeModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    // Helper function to convert aggregation results to object
    const toObject = (arr: any[], key = '_id', value = 'count') =>
      arr.reduce((acc, item) => {
        acc[item[key] || 'unknown'] = item[value];
        return acc;
      }, {});

    // Format monthly trend data
    const formatMonthlyTrend = (data: any[]) =>
      data.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        count: item.count,
        label: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      }));

    // Format client monthly trend with type breakdown
    const formatClientTrend = (data: any[]) => {
      const grouped: Record<string, { clients: number; agents: number }> = {};
      data.forEach((item) => {
        const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        if (!grouped[key]) {
          grouped[key] = { clients: 0, agents: 0 };
        }
        if (item._id.type === ClientType.CLIENT) {
          grouped[key].clients = item.count;
        } else {
          grouped[key].agents = item.count;
        }
      });
      return Object.entries(grouped).map(([label, data]) => ({
        label,
        ...data,
        total: data.clients + data.agents,
      }));
    };

    // Format revenue monthly trend
    const formatRevenueTrend = (data: any[]) =>
      data.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        label: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        totalAmount: item.totalAmount,
        paidAmount: item.paidAmount,
        invoiceCount: item.count,
      }));

    return {
      overview: {
        totalRequests,
        totalClients,
        totalAgents,
        totalUsers,
        totalDocuments,
        totalShipments,
        totalInvoices,
        totalIssuedCodes,
      },

      requests: {
        byType: toObject(requestsByType),
        byStatus: toObject(requestsByStatus),
        bySource: toObject(requestsBySource),
        thisMonth: requestsThisMonth,
        completedThisMonth: completedRequestsThisMonth,
        monthlyTrend: formatMonthlyTrend(requestsMonthlyTrend),
      },

      clients: {
        total: totalClients + totalAgents,
        clients: totalClients,
        agents: totalAgents,
        newThisMonth: clientsThisMonth,
        monthlyTrend: formatClientTrend(clientsMonthlyTrend),
      },

      documents: {
        total: totalDocuments,
        byStatus: toObject(documentsByStatus),
        byType: toObject(documentsByType),
        byPriority: toObject(documentsByPriority),
        thisMonth: documentsThisMonth,
      },

      shipments: {
        total: totalShipments,
        byStatus: toObject(shipmentsByStatus),
        thisMonth: shipmentsThisMonth,
        deliveredThisMonth,
        inTransit: toObject(shipmentsByStatus)[ShipmentStatus.IN_TRANSIT] || 0,
      },

      invoices: {
        total: totalInvoices,
        byStatus: toObject(invoicesByStatus),
        revenue: {
          total: totalRevenue[0]?.total || 0,
          paid: paidRevenue[0]?.total || 0,
          unpaid: unpaidRevenue[0]?.total || 0,
          thisMonth: revenueThisMonth[0]?.total || 0,
        },
        monthlyTrend: formatRevenueTrend(revenueMonthlyTrend),
      },

      users: {
        total: totalUsers,
        byRole: toObject(usersByRole),
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },

      issuedCodes: {
        total: totalIssuedCodes,
        byStatus: toObject(codesByStatus),
        thisMonth: codesThisMonth,
        active: toObject(codesByStatus)[CodeStatus.ACTIVE] || 0,
      },

      generatedAt: new Date().toISOString(),
    };
  }

  async getStatisticsByDateRange(startDate: Date, endDate: Date): Promise<any> {
    const [
      requestsInRange,
      requestsByTypeInRange,
      requestsByStatusInRange,
      requestsBySourceInRange,
      completedInRange,

      clientsInRange,
      documentsInRange,
      shipmentsInRange,
      deliveredInRange,

      invoicesInRange,
      revenueInRange,
      paidRevenueInRange,
    ] = await Promise.all([
      this.requestModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.requestModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.requestModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$statusKey', count: { $sum: 1 } } },
      ]),
      this.requestModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      this.requestModel.countDocuments({
        statusKey: RequestStatusKey.COMPLETED,
        updatedAt: { $gte: startDate, $lte: endDate },
      }),

      this.clientModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.documentModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.shipmentModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.shipmentModel.countDocuments({
        status: ShipmentStatus.DELIVERED,
        actualArrivalDate: { $gte: startDate, $lte: endDate },
      }),

      this.invoiceModel.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.invoiceModel.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { paidAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } },
      ]),
    ]);

    const toObject = (arr: any[]) =>
      arr.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {});

    return {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      requests: {
        total: requestsInRange,
        byType: toObject(requestsByTypeInRange),
        byStatus: toObject(requestsByStatusInRange),
        bySource: toObject(requestsBySourceInRange),
        completed: completedInRange,
      },
      clients: {
        new: clientsInRange,
      },
      documents: {
        new: documentsInRange,
      },
      shipments: {
        total: shipmentsInRange,
        delivered: deliveredInRange,
      },
      invoices: {
        count: invoicesInRange,
        revenue: revenueInRange[0]?.total || 0,
        paidRevenue: paidRevenueInRange[0]?.total || 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getManagerStatistics(managerId: string): Promise<any> {
    const { Types } = require('mongoose');
    const managerObjectId = new Types.ObjectId(managerId);

    const [
      totalAssigned,
      assignedByStatus,
      assignedByType,
      completedRequests,
      activeRequests,
    ] = await Promise.all([
      this.requestModel.countDocuments({ assignedTo: managerObjectId }),
      this.requestModel.aggregate([
        { $match: { assignedTo: managerObjectId } },
        { $group: { _id: '$statusKey', count: { $sum: 1 } } },
      ]),
      this.requestModel.aggregate([
        { $match: { assignedTo: managerObjectId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.requestModel.countDocuments({
        assignedTo: managerObjectId,
        statusKey: RequestStatusKey.COMPLETED,
      }),
      this.requestModel.countDocuments({
        assignedTo: managerObjectId,
        statusKey: { $nin: [RequestStatusKey.COMPLETED, RequestStatusKey.REJECTED] },
      }),
    ]);

    const toObject = (arr: any[]) =>
      arr.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {});

    return {
      managerId,
      totalAssigned,
      activeRequests,
      completedRequests,
      byStatus: toObject(assignedByStatus),
      byType: toObject(assignedByType),
      completionRate: totalAssigned > 0
        ? Math.round((completedRequests / totalAssigned) * 100)
        : 0,
    };
  }
}
