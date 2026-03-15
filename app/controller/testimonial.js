import initModels from '../../models/init_models.js';

export const createTestimonial = async (req, res) => {
  try {
    const db = await initModels();
    const { name, rating, content } = req.body;
    const testimonial = await db.testimonial.create({ name, rating, content });
    res.status(201).json(testimonial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create testimonial', details: err.message });
  }
};

export const getTestimonials = async (req, res) => {
  try {
    const db = await initModels();
    const testimonials = await db.testimonial.findAll({ order: [['position', 'ASC'], ['created_at', 'DESC']] });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch testimonials', details: err.message });
  }
};

export const getTestimonialById = async (req, res) => {
  try {
    const db = await initModels();
    const testimonial = await db.testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });
    res.json(testimonial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch testimonial', details: err.message });
  }
};

export const updateTestimonial = async (req, res) => {
  try {
    const db = await initModels();
    const testimonial = await db.testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });
    const { name, rating, content } = req.body;
    await testimonial.update({ name, rating, content });
    res.json(testimonial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update testimonial', details: err.message });
  }
};

export const deleteTestimonial = async (req, res) => {
  try {
    const db = await initModels();
    const testimonial = await db.testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });
    await testimonial.destroy();
    res.json({ message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete testimonial', details: err.message });
  }
};

export const updateTestimonialOrder = async (req, res) => {
  try {
    const db = await initModels();
    const { testimonials } = req.body;
    if (!Array.isArray(testimonials)) {
      return res.status(400).json({ error: 'Testimonials must be an array' });
    }
    const promises = testimonials.map(({ id, position }) =>
      db.testimonial.update({ position }, { where: { id } })
    );
    await Promise.all(promises);
    res.json({ message: 'Testimonial order updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update testimonial order', details: err.message });
  }
};
