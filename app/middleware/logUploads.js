export default function logFiles(req, res, next) {
  console.log('--- req.body ---');
  console.log(req.body);

  console.log('--- req.file ---'); // Only for single()
  console.log(req.file);

  console.log('--- req.files ---'); // For fields()
  console.log(req.files);

  next();
}
