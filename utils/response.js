export const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    statusCode,
    success: true,
    message,
    data
  };
};

export const errorResponse = (message = 'Error', statusCode = 400, details = null) => {
  return {
    statusCode,
    success: false,
    message,
    ...(details && { details })
  };
};
