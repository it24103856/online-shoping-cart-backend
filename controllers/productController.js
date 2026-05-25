import Product from "../models/Product.js";
import { isAdmin } from "../middleware/authMiddleware.js";



// create product
export const createProduct=async(req,res)=>{
    try {
        const product=new Product(req.body);
        await product.save();
        res.status(201).json({message:"Product created successfully",product})
    } catch (error) {
        res.status(500).json({message:"Error creating product",error})
    }
}

// get all products
export const getAllProducts=async(req,res)=>{
    if(isAdmin(req)){
        Product.find().then(products=>{
            res.json(products)
        }).catch(err=>{
            res.status(500).json({message:"Error fetching products",err})
        })
    }else{
     Product.find({isAvailable:true}).then(products=>{
            res.json(products)
        }).catch(err=>{
            res.status(500).json({message:"Error fetching products",err})
         
     })}
}


// get product by id
export const getProductById=async(req,res)=>{
    const productID=req.params.ProductID;

    try {
        const product = await Product.findOne({productId:productID});
        if(product==null){
            res.status(404).json({message:"Product not found"})
        }else{
            res.json(product)
        }
    } catch(err){
        res.status(500).json({message:"Error fetching product",err})
    }
}

// update product - admin only

export const updateProduct=async(req,res)=>{
    if(!isAdmin(req)){
        return res.status(403).json({message:"Forbidden"})
    }
    const productID=req.params.ProductID;
    Product.updateOne({productId:productID},{$set:req.body}).then(result=>{
        if(result.matchedCount===0){
            res.status(404).json({message:"Product not found"})
        }
        res.json({message:"Product updated"})
    }).catch(err=>{
        res.status(500).json({message:"Error updating product",err})
    }
    )
}

// delete product - admin only

export const deleteProduct=async(req,res)=>{
    if(!isAdmin(req)){
        return res.status(403).json({message:"Forbidden"})
    }
    const productID=req.params.ProductID;
    Product.deleteOne({productId:productID}).then(result=>{
        if(result.deletedCount===0){
            res.status(404).json({message:"Product not found"})
        }
        res.json({message:"Product deleted"})
    }).catch(err=>{
        res.status(500).json({message:"Error deleting product",err})
    }
    )
}

//search products by name or category
export const searchProducts=async(req,res)=>{
    const query=req.query.q;
    if(!query){
        return res.status(400).json({message:"Query parameter 'q' is required"})
    }
    try{
        const products=await Product.find({
            $or:[   
                {name:{$regex:query,$options:"i"}},
                {category:{$regex:query,$options:"i"}}
            ],
            isAvailable:true
        });
        res.json(products)
    }catch(err){
        res.status(500).json({message:"Error searching products",err})
    }
}
