import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Reminder from '../models/Reminder';
import SystemLog from '../models/SystemLog';
import { sanitizeObjectId, sanitizeNumber } from '../utils/sanitize';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalReminders = await Reminder.countDocuments();
        const pendingReminders = await Reminder.countDocuments({ status: { $in: ['pending', 'processing'] } });
        const activeUsers = await User.countDocuments({ isBanned: false });
        const recentLogs = await SystemLog.find().sort({ timestamp: -1 }).limit(5);

        res.json({
            totalUsers,
            totalReminders,
            pendingReminders,
            activeUsers,
            recentLogs
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        // Retrieve reminder counts for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const reminderCount = await Reminder.countDocuments({ user: user._id });
            const pendingCount = await Reminder.countDocuments({
                user: user._id,
                status: { $in: ['pending', 'processing'] }
            });
            return {
                ...user.toObject(),
                reminderCount,
                pendingCount
            };
        }));
        res.json(usersWithStats);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getReminders = async (req: Request, res: Response) => {
    try {
        const reminders = await Reminder.find()
            .populate('user', 'name platform platformId')
            .sort({ status: 1, scheduledAt: 1 }) // Prioritize 'failed'/'pending' over 'sent', then by date
            .limit(200); // Increased limit slightly for better visibility
        res.json(reminders);
    } catch (error) {
        console.error('Fetch Reminders Error:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
};

export const getSystemLogs = async (req: Request, res: Response) => {
    try {
        const logs = await SystemLog.find().sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (error) {
        console.error('Fetch Logs Error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};

export const toggleUserBan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sanitizedId = sanitizeObjectId(id as string); // Validate ID format
        const user = await User.findById(sanitizedId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isBanned = !user.isBanned;
        await user.save();

        await SystemLog.create({
            action: user.isBanned ? 'BAN_USER' : 'UNBAN_USER',
            targetUserId: (user._id as any).toString(),
            details: { platformId: user.platformId }
        });

        res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'}`, user });
    } catch (error) {
        console.error('Toggle Ban Error:', error);
        res.status(500).json({ error: 'Failed to toggle ban' });
    }
};

export const updateUserLimit = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { limit } = req.body;

        const sanitizedId = sanitizeObjectId(id as string);
        const sanitizedLimit = sanitizeNumber(limit, 0, 10000); // 0-10000 range

        const user = await User.findById(sanitizedId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const oldLimit = user.reminderLimit;
        user.reminderLimit = sanitizedLimit;
        await user.save();

        await SystemLog.create({
            action: 'UPDATE_LIMIT',
            targetUserId: (user._id as any).toString(),
            details: { oldLimit, newLimit: limit }
        });

        res.json({ message: 'Limit updated', user });
    } catch (error) {
        console.error('Update Limit Error:', error);
        res.status(500).json({ error: 'Failed to update limit' });
    }
};

export const clearPendingReminders = async (req: Request, res: Response) => {
    try {
        const result = await Reminder.deleteMany({ status: 'pending' });

        await SystemLog.create({
            action: 'CLEAR_REMINDERS',
            details: { count: result.deletedCount, status: 'pending' }
        });

        res.json({
            message: 'Pending reminders cleared',
            count: result.deletedCount
        });
    } catch (error) {
        console.error('Clear Pending Reminders Error:', error);
        res.status(500).json({ error: 'Failed to clear pending reminders' });
    }
};
