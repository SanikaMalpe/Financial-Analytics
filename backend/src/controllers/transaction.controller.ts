import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import { Parser } from 'json2csv';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const user = req.query.user as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const amountMin = req.query.amountMin ? Number(req.query.amountMin) : undefined;
    const amountMax = req.query.amountMax ? Number(req.query.amountMax) : undefined;
    const sortBy = (req.query.sortBy as string) || 'date';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (user) filter.user_id = { $regex: user, $options: 'i' };

    // Date Range Filter
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    // Amount Range Filter
    if (amountMin !== undefined || amountMax !== undefined) {
      filter.amount = {};
      if (amountMin !== undefined) filter.amount.$gte = amountMin;
      if (amountMax !== undefined) filter.amount.$lte = amountMax;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit),
      Transaction.countDocuments(filter)
    ]);

    res.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const exportCSV = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const user = req.query.user as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const amountMin = req.query.amountMin ? Number(req.query.amountMin) : undefined;
    const amountMax = req.query.amountMax ? Number(req.query.amountMax) : undefined;
    const columnsParam = req.query.columns as string;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (user) filter.user_id = { $regex: user, $options: 'i' };

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    if (amountMin !== undefined || amountMax !== undefined) {
      filter.amount = {};
      if (amountMin !== undefined) filter.amount.$gte = amountMin;
      if (amountMax !== undefined) filter.amount.$lte = amountMax;
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 }).limit(1000);
    const fields = columnsParam ? columnsParam.split(',') : ['id', 'date', 'amount', 'category', 'status', 'user_id'];

    const parser = new Parser({ fields });
    const csv = parser.parse(transactions);

    res.header('Content-Type', 'text/csv');
    res.attachment('transactions_export.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'CSV Export failed', error });
  }
};