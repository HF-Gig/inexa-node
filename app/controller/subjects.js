import initModels from '../../models/init_models.js';

export const createSubject = async (req, res) => {
  try {
    const db = await initModels();
    let { title, slug, image_url, status, display_order } = req.body;
    if (image_url && !image_url.startsWith('http')) {
      const baseUrl = process.env.BASE_URL;
      image_url = baseUrl.replace(/\/$/, '') + (image_url.startsWith('/') ? image_url : '/' + image_url);
    }
    const subject = await db.subject.create({ title, slug, image_url, status, display_order });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject', details: err.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const db = await initModels();
    const subjects = await db.subject.findAll({ order: [['display_order', 'ASC'], ['created_at', 'DESC']] });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects', details: err.message });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const db = await initModels();
    const subject = await db.subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subject', details: err.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const db = await initModels();
    const subject = await db.subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    let { title, slug, image_url, status, display_order } = req.body;
    if (image_url && !image_url.startsWith('http')) {
      const baseUrl = process.env.BASE_URL;
      image_url = baseUrl.replace(/\/$/, '') + (image_url.startsWith('/') ? image_url : '/' + image_url);
    }
    await subject.update({ title, slug, image_url, status, display_order });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject', details: err.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const db = await initModels();
    const subject = await db.subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    await subject.destroy();
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject', details: err.message });
  }
}; 

export const enbl_dsbl_subjects = async (req, res) => {
  try {
    const db = await initModels();
    const { id } = req.params;
    const { status } = req.body;
    const subject = await db.subject.findByPk(id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    await subject.update({ status });
    res.json({ message: 'Subject status updated', subject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject status', details: err.message });
  }
};

export const updateSubjectsOrder = async (req, res) => {
  try {
    const db = await initModels();
    const { subjects } = req.body; // Array of { id, display_order }
    if (!Array.isArray(subjects)) {
      return res.status(400).json({ error: 'Subjects must be an array' });
    }

    // Check if all subjects exist
    for (const subject of subjects) {
      const existingSubject = await db.subject.findByPk(subject.id);
      if (!existingSubject) {
        return res.status(404).json({ error: `Subject with id ${subject.id} not found` });
      }
    }

    const promises = subjects.map(subject =>
      db.subject.update({ display_order: subject.display_order }, { where: { id: subject.id } })
    );
    await Promise.all(promises);
    res.json({ message: 'Subjects order updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subjects order', details: err.message });
  }
};
