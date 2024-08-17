const express = require('express');
const nunjucks = require('nunjucks');
const axios = require('axios');

const app = express();
const port = 3020;

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

app.use(express.static('public'));
app.use(express.json());

const fetchData = async () => {
    try {
        const response = await axios.get('https://eqalzzsaeycollxbvtvt.supabase.co/rest/v1/data', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYWx6enNhZXljb2xseGJ2dHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0OTIyODMsImV4cCI6MjAzNzA2ODI4M30.MOIPl30sDZhsUzbyr-2ZSvwjm9ZIowFBE97GsR0HF6g',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYWx6enNhZXljb2xseGJ2dHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0OTIyODMsImV4cCI6MjAzNzA2ODI4M30.MOIPl30sDZhsUzbyr-2ZSvwjm9ZIowFBE97GsR0HF6g'
            }
        });
        return response.data.map(item => ({
            ...item,
            slug: item.Name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
            episodes: Array.isArray(item.Episodes) ? item.Episodes : [item.Episodes],
            platforms: Array.isArray(item.Platforms) ? item.Platforms : item.Platforms ? item.Platforms.split(',').map(p => p.trim()) : [],
            genre: Array.isArray(item.Genre) ? item.Genre : item.Genre ? item.Genre.split(',').map(g => g.trim()) : [],
            type: item.Type || 'movie'
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
};

// Function to fetch data and handle multiple parallel requests
const fetchDataParallel = async () => {
    try {
        const requests = [
            fetchData(),
            fetchData() // Add more fetch requests if needed
        ];
        const [data1, data2] = await Promise.all(requests);
        return [...data1, ...data2]; // Combine the results if necessary
    } catch (error) {
        console.error('Error fetching data in parallel:', error);
        return [];
    }
};

app.get('/posts', async (req, res) => {
    const data = await fetchDataParallel();
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 12;
    const paginatedData = paginateData(data, page, itemsPerPage);
    res.render('posts.njk', { 
        data: paginatedData.data,
        currentPage: page,
        totalPages: paginatedData.totalPages 
    });
});

app.get('/', async (req, res) => {
    await fetchDataParallel(); // Data is not used, but fetching it here just in case
    res.render('index.njk');
});

app.get('/:slug', async (req, res) => {
    const data = await fetchDataParallel();
    const item = data.find(i => i.slug === req.params.slug);
    if (item) {
        if (item.type === 'series') {
            res.render('main/series-detail.njk', { series: item });
        } else {
            res.render('main/movie-detail.njk', { movie: item });
        }
    } else {
        res.status(404).render('main/404.njk');
    }
});

app.get('/genre/:genre', async (req, res) => {
    const { genre } = req.params;
    const data = await fetchDataParallel();
    const filteredData = data.filter(item => 
        item.genre.some(g => g.toLowerCase().includes(genre.toLowerCase()))
    );
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 12;
    const paginatedData = paginateData(filteredData, page, itemsPerPage);
    res.render('genretemp.njk', { 
        data: paginatedData.data, 
        genre,
        currentPage: page,
        totalPages: paginatedData.totalPages 
    });
});

function paginateData(data, page, itemsPerPage) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
        data: data.slice(startIndex, endIndex),
        totalPages: Math.ceil(data.length / itemsPerPage)
    };
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
