import User, { IUser } from '../models/User';

export const findOrCreateUser = async (
    platform: 'whatsapp' | 'telegram',
    platformId: string,
    name?: string
): Promise<IUser> => {
    let user = await User.findOne({ platform, platformId });
    if (!user) {
        user = await User.create({ platform, platformId, name });
    } else if (name && user.name !== name) {
        user.name = name;
        await user.save();
    }
    return user;
};

export const getUserStats = async () => {
    const total = await User.countDocuments();
    const whatsapp = await User.countDocuments({ platform: 'whatsapp' });
    const telegram = await User.countDocuments({ platform: 'telegram' });
    return { total, whatsapp, telegram };
};
