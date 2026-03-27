import initModels from '../../models/init_models.js';

export const createSiteStatistic = async (req, res) => {
  try {
    const db = await initModels();
    const { title, value, order, status } = req.body;
    const stat = await db.site_statistics.create({ title, value, order, status });
    res.status(201).json(stat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create site statistic', details: err.message });
  }
};

export const getSiteStatistics = async (req, res) => {
  try {
    const db = await initModels();
    const stats = await db.site_statistics.findAll({ order: [['order', 'ASC']] });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch site statistics', details: err.message });
  }
};

export const getSiteStatisticById = async (req, res) => {
  try {
    const db = await initModels();
    const stat = await db.site_statistics.findByPk(req.params.id);
    if (!stat) return res.status(404).json({ error: 'Site statistic not found' });
    res.json(stat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch site statistic', details: err.message });
  }
};

export const updateSiteStatistic = async (req, res) => {
  try {
    const db = await initModels();
    const stat = await db.site_statistics.findByPk(req.params.id);
    if (!stat) return res.status(404).json({ error: 'Site statistic not found' });
    const { title, value, order, status } = req.body;
    await stat.update({ title, value, order, status });
    res.json(stat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update site statistic', details: err.message });
  }
};

export const deleteSiteStatistic = async (req, res) => {
  try {
    const db = await initModels();
    const stat = await db.site_statistics.findByPk(req.params.id);
    if (!stat) return res.status(404).json({ error: 'Site statistic not found' });
    await stat.destroy();
    res.json({ message: 'Site statistic deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete site statistic', details: err.message });
  }
}; 

export const getHomeStatsCount = async (req, res) => {
  const db = await initModels();
  try{
    const totalActiveCourses = await db.courses.count({ where: { status: 1 } });
    const totalUsers = await db.user.count();
    return res.status(200).json({ totalCourses: totalActiveCourses, totalUsers });
  }
  catch(err){
    return res.status(500).json({ error: 'Failed to fetch home stats count', details: err.message });
  }
}