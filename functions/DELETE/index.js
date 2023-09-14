const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/db');

async function deleteBooking(id) {
    const params = {
      TableName: 'Booking',
      Key: {
        id: id,
      },
    };
  
    try {
      await db.delete(params).promise();
    } catch (error) {
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
}

exports.handler = async (event, context) => {
    try {
        const { id } = event.pathParameters;
  
        if (!id) {
          return sendResponse(400, {
            success: false,
            message: 'Booking ID must be provided',
          });
        }

        const params = {
            TableName: 'Booking',
            Key: {
              id: id,
            },
          };

        const { Item: booking } = await db.get(params).promise();


        if (!booking) {
          return sendResponse(404, {
            success: false,
            message: 'Booking not found',
          });
        }
  
        const currentDate = new Date();
        const checkInDate = new Date(booking.checkInDate);
        const DateControl = checkInDate - currentDate;
        const DateControlDays = DateControl / (1000 * 60 * 60 * 24);
  
        if (DateControlDays <= 2) {
          return sendResponse(400, {
            success: false,
            message: 'Booking is less than 2 days away, cannot delete',
          });
        }
  
        await deleteBooking(id);
  
        return sendResponse(200, {
            success: true,
            message: 'Booking has been deleted',
        });
    } catch (error) {
      console.error(error);
      return sendResponse(500, {
        success: false,
        message: error.message || 'Could not delete booking',
      });
    }
  };
  