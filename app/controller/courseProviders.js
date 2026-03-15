import initModels from '../../models/init_models.js';
import fs from 'fs';
import path from 'path';

export const createCourseProvider = async (req, res) => {
  try {
    const db = await initModels();
    const { name, slug, status } = req.body;
    let logo_url = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const newFilename = `${slug}${ext}`;
      const newPath = path.join('uploads/', newFilename);
      fs.renameSync(req.file.path, newPath);
      logo_url = '/' + newPath;
    }
    const provider = await db.course_providers.create({ name, logo_url, slug, status });
    res.status(201).json(provider);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course provider', details: err.message });
  }
};

export const getCourseProviders = async (req, res) => {
  try {
    const db = await initModels();
    const providers = await db.course_providers.findAll({ order: [['created_at', 'DESC']] });
    res.status(200).json({providers});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course providers', details: err.message });
  }
};

export const getCourseProviderById = async (req, res) => {
  try {
    const db = await initModels();
    const provider = await db.course_providers.findByPk(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Course provider not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course provider', details: err.message });
  }
};

export const updateCourseProvider = async (req, res) => {
  try {
    const db = await initModels();
    const provider = await db.course_providers.findByPk(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Course provider not found' });

    const { name, slug, status } = req.body;
    let logo_url = provider.logo_url;

    if (req.file) {
      // Delete old file if exists
      if (provider.logo_url && fs.existsSync(provider.logo_url)) {
        try {
          fs.unlinkSync(provider.logo_url);
        } catch (unlinkErr) {
          console.warn('Failed to delete old logo:', unlinkErr.message);
        }
      }

      const ext = path.extname(req.file.originalname);
      const newFilename = `${slug}${ext}`;
      const newPath = path.join('uploads', newFilename);

      // Copy file instead of rename (fixes Windows EPERM)
      fs.copyFileSync(req.file.path, newPath);

      // Remove temp file after copying
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.warn('Failed to remove temp file:', cleanupErr.message);
      }

      logo_url = '/' + newPath.replace(/\\/g, '/');
    }

    await provider.update({ name, logo_url, slug, status });
    res.json(provider);
  } catch (err) {
    console.error('Error while updating course provider:', err);
    res.status(500).json({
      error: 'Failed to update course provider',
      details: err.message,
    });
  }
};


export const deleteCourseProvider = async (req, res) => {
  try {
    const db = await initModels();
    const provider = await db.course_providers.findByPk(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Course provider not found' });
    // Delete associated logo file if exists
    if (provider.logo_url && fs.existsSync(provider.logo_url)) {
      fs.unlinkSync(provider.logo_url);
    }
    await provider.destroy();
    res.json({ message: 'Course provider deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course provider', details: err.message });
  }
};
